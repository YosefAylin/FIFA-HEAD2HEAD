import { NextResponse } from 'next/server'
import { fetchChatMessages, sendChatMessage } from '@/lib/supabase/chat'
import {
  acquireBotLock,
  readBotState,
  releaseBotLock,
  writeBotState,
} from '@/lib/supabase/botState'
import { buildBotDigest } from '@/lib/bot/context'
import { generateReply, type ChatTurn } from '@/lib/bot/gemini'
import { buildBanterPool, buildSystemPrompt, loadBotConfig, sanitizeReply } from '@/lib/bot/prompts'
import { maybeUpdateBotMemory } from '@/lib/bot/memory'
import { BOT_NAME, MAX_REPLIES_PER_TICK } from '@/lib/bot/constants'
import type { ChatMessage } from '@/lib/types/database'

/** Default prior turns the bot sees per reply; overridable via config. */
const DEFAULT_HISTORY_WINDOW = 24
const MIN_HISTORY = 0
const MAX_HISTORY = 40

/** Delay between per-message LLM calls to avoid slamming the free-tier wall. */
const SPACING_MS = 1200

/** Proactive reply daily budget + cooldown (only the cron may speak unprompted). */
const PROACTIVE_DAILY = Number(process.env.BOT_PROACTIVE_DAILY ?? 3)
const PROACTIVE_COOLDOWN_MIN = Number(process.env.BOT_PROACTIVE_COOLDOWN_MIN ?? 180)

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** A short, stable signature of the digest so we can spot "news" between ticks. */
function digestSig(digest: string): string {
  // Keep it cheap: a stable hash is overkill — the current-week stanza is the
  // news-bearing part. Truncate to a fixed slice; fine for change detection.
  return digest.slice(0, 600)
}

/**
 * Bot wake-up endpoint — GET-only. Two sources:
 *  1. the app pings it right after a human sends a chat message (instant
 *     reply), and
 *  2. a single once-a-day `vercel.json` cron acts as a catch-up sweep.
 *
 * Each tick: take a lock → check cooldown → read the cursor → pull new human
 * messages → build a fresh grounded stats digest → generate + post one reply
 * per new message (spaced out, so a burst doesn't pile into the 429 wall) →
 * refresh the rolling memory (time-budgeted, eager on `force`) → advance the
 * cursor (even on LLM quota errors). The cron may, on digest-news, drop one
 * budgeted proactive note.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.BOT_CRON_SECRET
  if (secret) {
    const given = new URL(request.url).searchParams.get('secret')
    if (given !== secret) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  if (!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ ok: false, error: 'no AI provider key configured' }, { status: 500 })
  }

  if (!(await acquireBotLock())) {
    return NextResponse.json({ ok: true, skipped: 'lock held by another tick' })
  }

  try {
    const state = await readBotState()
    const isCron = new URL(request.url).searchParams.get('force') === '1'

    // Free-tier cooldown: if a recent burst exhausted the provider, stay quiet
    // until it reopens instead of hammering the same wall.
    if (state.cooldown_until && new Date(state.cooldown_until).getTime() > Date.now()) {
      await releaseBotLock()
      return NextResponse.json({ ok: true, skipped: 'cooldown' })
    }

    // Cold start: anchor the cursor to the newest existing message so the bot
    // never replies to history on its first run.
    if (!state.last_msg_created_at) {
      const existing = await fetchChatMessages()
      const newest = existing[existing.length - 1]
      await writeBotState({ ...state, last_msg_created_at: newest?.created_at ?? new Date(0).toISOString(), locked_at: null })
      return NextResponse.json({ ok: true, processed: 0, coldStart: true })
    }

    const messages = await fetchChatMessages()
    const newMessages = messages.filter(
      (m) => m.created_at > state.last_msg_created_at! && m.author_name !== BOT_NAME
    )

    if (newMessages.length === 0 && !isCron) {
      await releaseBotLock()
      return NextResponse.json({ ok: true, processed: 0 })
    }

    const digest = await buildBotDigest()
    const banterPool = await buildBanterPool()
    const config = await loadBotConfig()
    const system = buildSystemPrompt(digest, banterPool, config)

    const historyWindow = Math.max(MIN_HISTORY, Math.min(MAX_HISTORY, config.historyWindow ?? DEFAULT_HISTORY_WINDOW))

    function historyBefore(msg: ChatMessage): ChatTurn[] {
      return messages
        .filter((m) => m.created_at < msg.created_at)
        .slice(-historyWindow)
        .map((m) => ({ author: m.author_name, text: m.body, isBot: m.author_name === BOT_NAME }))
    }

    // Rolling-memory refresh: eager on cron, time-budgeted otherwise.
    await maybeUpdateBotMemory({ force: isCron })

    let replied = 0
    let failed = 0
    let lastHandled = state.last_msg_created_at

    for (const msg of newMessages.slice(0, MAX_REPLIES_PER_TICK)) {
      // Space the calls so a burst doesn't synchronize into the same 429 wall.
      if (replied + failed > 0) {
        await new Promise((r) => setTimeout(r, SPACING_MS + Math.floor(Math.random() * 400)))
      }
      try {
        const raw = await generateReply({
          system,
          author: msg.author_name,
          userText: msg.body,
          history: historyBefore(msg),
        })
        const reply = sanitizeReply(raw)
        await sendChatMessage(BOT_NAME, reply)
        replied++
      } catch (e) {
        failed++
        // Only the cron can proactively speak; a burst that exhausts every
        // provider opens a cooldown so the next ping backs off.
        if (isCron) {
          await writeBotState({ ...state, cooldown_until: new Date(Date.now() + 3 * 60 * 1000).toISOString(), last_msg_created_at: lastHandled, locked_at: null })
        }
      }
      if (msg.created_at > lastHandled) lastHandled = msg.created_at
    }

    // Budgeted proactive only on the cron, only when there is digest-news, and
    // only a handful of times per day (never floods).
    let proactive = 0
    if (isCron) {
      const today = dayKey(new Date())
      const count = state.proactive_day === today ? state.proactive_count : 0
      const news = digestSig(digest) !== state.last_digest_sig
      const coolEnough = !state.cooldown_until || new Date(state.cooldown_until).getTime() < Date.now()
      if (news && count < PROACTIVE_DAILY && coolEnough) {
        const sig = digestSig(digest)
        if (sig !== state.last_digest_sig) {
          proactive = 1
          const note = await generateReply({
            system,
            author: 'מערכת',
            userText: 'חלה ידיעה חדשה בדיגסט. ספר עליה בשניים-שלושה משפטים, בסגנון הקובה, אל תמציא.',
          }).catch(() => '')
          if (note) await sendChatMessage(BOT_NAME, sanitizeReply(note))
        }
      }
    }

    // Persist newest handled cursor + any state changes. If capped, roll over.
    const capped = newMessages.length > MAX_REPLIES_PER_TICK
    const finalCursor = capped ? (lastHandled ?? state.last_msg_created_at!) : newMessages.length ? newMessages[newMessages.length - 1].created_at : state.last_msg_created_at!
    const nextState = {
      ...state,
      last_msg_created_at: finalCursor,
      locked_at: null,
      last_digest_sig: digestSig(digest),
      proactive_count: state.proactive_day === dayKey(new Date()) ? state.proactive_count + proactive : proactive,
      proactive_day: dayKey(new Date()),
    }
    await writeBotState(nextState)

    return NextResponse.json({ ok: true, processed: newMessages.length, replied, failed, proactive, cursor: finalCursor })
  } finally {
    await releaseBotLock()
  }
}