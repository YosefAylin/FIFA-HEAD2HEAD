import { NextResponse } from 'next/server'
import { fetchChatMessages, sendChatMessage } from '@/lib/supabase/chat'
import { acquireBotLock, readBotState, releaseBotLock, writeBotState } from '@/lib/supabase/botState'
import { buildBotDigest } from '@/lib/bot/context'
import { streamReply, type ChatTurn } from '@/lib/bot/gemini'
import { buildBanterPool, buildSystemPrompt, loadBotConfig, sanitizeReply, isCoTLeak, isLeakedInstructions } from '@/lib/bot/prompts'
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
  if (!process.env.OPENROUTER_API_KEY) {
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
        let acc = ''
        try {
          for await (const token of streamReply({ system, author: targetAuthor, userText: text, history })) {
            acc += token
            if (!holdStart(acc)) {
              controller.enqueue(enc.encode(`data: ${JSON.stringify(token)}\n\n`))
            }
          }
          const final = sanitizeReply(acc)
          await sendChatMessage(BOT_NAME, final).catch(() => {})
          // Advance the cursor past the answered message so the cron/batch side
          // never re-replies to it.
          const state = await readBotState()
          if (target) await writeBotState({ ...state, last_msg_created_at: target.created_at, locked_at: null })
        } catch {
          // Don't leave the group hanging: persist a graceful fallback.
          await sendChatMessage(BOT_NAME, 'סבבה, הבנתי 🤷').catch(() => {})
        } finally {
          controller.enqueue(enc.encode('data: [DONE]\n\n'))
          controller.close()
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