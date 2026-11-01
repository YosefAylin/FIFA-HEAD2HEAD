import { NextResponse } from 'next/server'
import { fetchChatMessages, sendChatMessage } from '@/lib/supabase/chat'
import { acquireBotLock, readBotState, releaseBotLock, writeBotState } from '@/lib/supabase/botState'
import { buildBotDigest } from '@/lib/bot/context'
import { streamReply, botFailureMessage, hasBotProviderKey, type ChatTurn } from '@/lib/bot/openrouter'
import { buildBanterPool, buildSystemPrompt, loadBotConfig, sanitizeReplyOrNull, isCoTLeak, isLeakedInstructions } from '@/lib/bot/prompts'
import { BOT_NAME } from '@/lib/bot/constants'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MIN_HISTORY = 0
const MAX_HISTORY = 40
const DEFAULT_HISTORY_WINDOW = 24

/**
 * GPT-style streaming reply, paid model only.
 *
 * The sender posts their just-saved message text; the route targets the newest
 * human message, builds the same grounded digest prompt the batch route uses,
 * and streams the paid model's tokens back to the caller as SSE. When the stream
 * finishes the finished, sanitized reply is persisted + broadcast to the whole
 * group via the normal chat INSERT, and the bot cursor advances so the cron
 * doesn't answer the same message twice.
 *
 * The sender sees the tokens type out live; everyone else sees one finished
 * INSERT — no per-token DB writes.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 })
  if (!hasBotProviderKey()) {
    return NextResponse.json({ ok: false, error: 'no AI provider key configured' }, { status: 500 })
  }

  // One bot writes at a time; if a batch/cron tick or another stream holds the
  // lock, tell the caller so it can fall back to "the bot will reply shortly"
  // rather than doubling up on the same message.
  if (!(await acquireBotLock(90000))) return NextResponse.json({ ok: false, reason: 'busy' }, { status: 409 })

  let released = false
  const release = async (): Promise<void> => {
    if (released) return
    released = true
    await releaseBotLock()
  }

  try {
    const messages = await fetchChatMessages()
    // The just-sent human message is the newest non-bot row whose body matches.
    const target =
      [...messages].reverse().find((m) => m.author_name !== BOT_NAME && m.body.trim() === text) ??
      [...messages].reverse().find((m) => m.author_name !== BOT_NAME)
    const targetAuthor = target?.author_name ?? 'אנונימי'

    const digest = await buildBotDigest()
    const banterPool = await buildBanterPool()
    const config = await loadBotConfig()
    const system = buildSystemPrompt(digest, banterPool, config)
    const historyWindow = Math.max(MIN_HISTORY, Math.min(MAX_HISTORY, config.historyWindow ?? DEFAULT_HISTORY_WINDOW))
    const history: ChatTurn[] = target
      ? messages
          .filter((m) => m.created_at < target.created_at)
          .slice(-historyWindow)
          .map((m) => ({ author: m.author_name, text: m.body, isBot: m.author_name === BOT_NAME }))
      : []

    // Leak-prefix guard (live): while the accumulated prefix is still the
    // model narrating its own reasoning / echoing instructions, don't emit;
    // the moment a real reply starts, stream it. A pure-leak reply never emits.
    let started = false
    const holdStart = (acc: string): boolean => {
      const t = acc.trim()
      if (!started) {
        if (/^\s*(THOUGHT|THINK|REASONING|Confidence|Final)\b/i.test(t)) return true
        if (isCoTLeak(t) || isLeakedInstructions(t)) return true
        started = true
      }
      return false
    }

    const enc = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // The client may abort mid-stream; enqueue must never blow up the tick.
        const emit = (payload: string): void => {
          try {
            controller.enqueue(enc.encode(`data: ${payload}\n\n`))
          } catch {
            /* client already disconnected */
          }
        }
        let acc = ''
        try {
          for await (const token of streamReply({ system, author: targetAuthor, userText: text, history })) {
            acc += token
            if (!holdStart(acc)) {
              emit(JSON.stringify(token))
            }
          }
          // A cleaned reply that is empty or an instruction/CoT leak is truly
          // discarded — never posted, never swapped for a generic fallback. The
          // client is told explicitly so it can show the canned error bubble
          // instead of leaving the sender wondering why nothing arrived.
          const final = sanitizeReplyOrNull(acc)
          if (final) {
            try {
              await sendChatMessage(BOT_NAME, final)
            } catch (err) {
              console.error('[bot/stream] failed to persist reply:', err instanceof Error ? err.message : String(err))
              emit('[ERROR]')
            }
          } else {
            console.error('[bot/stream] discarded an empty/leaked reply (not posted):', acc.slice(0, 200))
            emit('[ERROR]')
          }
          // Advance the cursor past the answered message so the cron/batch side
          // never re-replies to it. Never move it backwards: two overlapping
          // rapid messages can finish out of order, and a regressed cursor
          // would make the bot re-answer messages it already handled.
          const state = await readBotState()
          if (target && (!state.last_msg_created_at || target.created_at > state.last_msg_created_at)) {
            await writeBotState({ ...state, last_msg_created_at: target.created_at, locked_at: null })
          }
        } catch (err) {
          // Never masquerade a model failure as the bot's own answer. Log the
          // real OpenRouter error and tell the group *why* it went quiet
          // (exhausted credits, bad key, rate limit, model missing, provider
          // outage) instead of a vague "couldn't think" line.
          const reason = botFailureMessage(err)
          console.error(
            '[bot/stream] model failed:',
            err instanceof Error ? `${err.name}: ${err.message}` : String(err),
            '| shown to group:',
            reason
          )
          try {
            await sendChatMessage(BOT_NAME, reason)
          } catch {
            emit('[ERROR]')
          }
        } finally {
          emit('[DONE]')
          try {
            controller.close()
          } catch {
            /* already closed */
          }
          await release()
        }
      },
      cancel() {
        void release()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (e) {
    await release()
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}