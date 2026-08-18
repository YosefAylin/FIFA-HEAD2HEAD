import { NextResponse } from 'next/server'
import { fetchChatMessages, sendChatMessage } from '@/lib/supabase/chat'
import {
  acquireBotLock,
  readBotState,
  releaseBotLock,
  writeBotState,
} from '@/lib/supabase/botState'
import { buildBotDigest } from '@/lib/bot/context'
import { generateReply } from '@/lib/bot/gemini'
import { buildBanterPool, buildSystemPrompt, sanitizeReply } from '@/lib/bot/prompts'
import { BOT_NAME, MAX_REPLIES_PER_TICK } from '@/lib/bot/constants'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Bot wake-up endpoint — GET-only. Two sources:
 *  1. the app pings it right after a human sends a chat message (instant
 *     reply), and
 *  2. a single once-a-day `vercel.json` cron acts as a catch-up sweep
 *     (Hobby plans allow only one daily cron).
 *
 * Each tick: take a lock → read the cursor → pull new human messages → build
 * a fresh grounded stats digest → generate + post one reply per new message →
 * advance the cursor (even on LLM quota errors, so a spent free tier never
 * becomes an infinite retry loop).
 */
export async function GET(request: Request): Promise<NextResponse> {
  // Optional secret guard for manual invocations. Vercel crons can append a
  // query param (BOT_CRON_SECRET) to the scheduled request.
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

    // Cold start: anchor the cursor to the newest existing message so the bot
    // never replies to history on its first run.
    if (!state.last_msg_created_at) {
      const existing = await fetchChatMessages()
      const newest = existing[existing.length - 1]
      await writeBotState({ last_msg_created_at: newest?.created_at ?? new Date(0).toISOString(), locked_at: null })
      return NextResponse.json({ ok: true, processed: 0, coldStart: true })
    }

    const messages = await fetchChatMessages()
    const newMessages = messages.filter(
      (m) => m.created_at > state.last_msg_created_at! && m.author_name !== BOT_NAME
    )

    if (newMessages.length === 0) {
      await releaseBotLock()
      return NextResponse.json({ ok: true, processed: 0 })
    }

    const digest = await buildBotDigest()
    const banterPool = await buildBanterPool()
    const system = buildSystemPrompt(digest, banterPool)

    let replied = 0
    let failed = 0
    let lastHandled = state.last_msg_created_at

    for (const msg of newMessages.slice(0, MAX_REPLIES_PER_TICK)) {
      try {
        const raw = await generateReply({ system, author: msg.author_name, userText: msg.body })
        const reply = sanitizeReply(raw)
        await sendChatMessage(BOT_NAME, reply)
        replied++
      } catch {
        failed++
      }
      // Advance regardless so quota flakes don't block later messages.
      if (msg.created_at > lastHandled) lastHandled = msg.created_at
    }

    // Persist the newest *handled* timestamp. If we capped out (more new
    // messages than the per-tick limit), we leave the cursor at the last
    // handled message so the rest roll over to the next tick.
    const capped = newMessages.length > MAX_REPLIES_PER_TICK
    const finalCursor: string = capped
      ? (lastHandled ?? state.last_msg_created_at!)
      : newMessages[newMessages.length - 1].created_at
    await writeBotState({ last_msg_created_at: finalCursor, locked_at: null })

    return NextResponse.json({ ok: true, processed: newMessages.length, replied, failed, cursor: finalCursor })
  } finally {
    await releaseBotLock()
  }
}
