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
import { liftRosterJabs, addBotBanter } from '@/lib/bot/rosterLift'
import { BOT_NAME, MAX_REPLIES_PER_TICK } from '@/lib/bot/constants'
import { fetchTournamentMode, isTournamentOpen } from '@/lib/supabase/tournamentGate'
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

/** A consecutive-win streak this big is worth a prompt note (crossing-based). */
const STREAK_MIN = Number(process.env.BOT_STREAK_MIN ?? 3)

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

/** Parse the current trailing-W streak length per player from the digest. */
function streakMap(digest: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const line of digest.split('\n')) {
    const name = line.split(':')[0].trim()
    if (!name || /^[0-9]/.test(name[0] ?? '')) continue // skip "1. name" rank lines
    const m = line.match(/רצף ([WL]+)/)
    if (!m) continue
    let n = 0
    while (n < m[1].length && m[1][n] === 'W') n++
    if (n > 0) out[name] = n
  }
  return out
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

    // Budgeted proactive only on the cron AND when game mode is open (gate `on`
    // or `auto` on Saturday). On closed days the bot stays quiet unprompted;
    // direct chat replies are untouched.
    let proactive = 0
    if (isCron) {
      const gameOn = isTournamentOpen(await fetchTournamentMode(), new Date())
      const today = dayKey(new Date())
      const count = state.proactive_day === today ? state.proactive_count : 0
      const coolEnough = !state.cooldown_until || new Date(state.cooldown_until).getTime() < Date.now()
      const sig = digestSig(digest)
      // Digest-news trend (existing). Only compare when we're allowed to emit;
      // if not, we still persist the sig below so a stale "news" doesn't fire
      // the instant the gate opens.
      let news = false
      let flare: [string, number] | null = null
      if (gameOn) {
        news = sig !== state.last_digest_sig
        // New streak-flare: a player crossed STREAK_MIN since the last sweep.
        const streaks = streakMap(digest)
        flare = Object.entries(streaks).find(
          ([name, len]) => len >= STREAK_MIN && (state.last_streaks[name] ?? 0) < STREAK_MIN
        ) ?? null
      }
      if (gameOn && coolEnough && count < PROACTIVE_DAILY && (news || flare)) {
        proactive = 1
        const prompt = flare
          ? `חבר "${flare[0]}" צעד לרצף ${flare[1]} ניצחונות רצופים. הגיב בשורה-שתיים בסגנון הקובה, אל תמציא.`
          : 'חלה ידיעה חדשה בדיגסט. ספר עליה בשניים-שלושה משפטים, בסגנון הקובה, אל תמציא.'
        const note = await generateReply({
          system,
          author: 'מערכת',
          userText: prompt,
          history: [],
        }).catch(() => '')
        if (note) await sendChatMessage(BOT_NAME, sanitizeReply(note))
      }
      // Jab + banter lifts are separate budget-limited enrichment — gate them
      // with game mode too (cron-only).
      if (gameOn) {
        await liftRosterJabs()
        if (count + (proactive ? 1 : 0) < PROACTIVE_DAILY) {
          await addBotBanter().catch(() => {})
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
      last_streaks: isCron ? streakMap(digest) : state.last_streaks,
    }
    await writeBotState(nextState)

    return NextResponse.json({ ok: true, processed: newMessages.length, replied, failed, proactive, cursor: finalCursor })
  } finally {
    await releaseBotLock()
  }
}