'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BOT_NAME } from '@/lib/bot/constants'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'

const INTERVAL_MS = 25000

/**
 * "דבר הבוט" — a prominent, unmissable card showing what the bot is
 * "thinking" right now: a rotating line from the group's banter pool
 * (built-in + the DB `fun_sentences`). The whole card is a call-to-action
 * that links straight into the /chat so people know they can talk to it.
 */
export function BotTalk() {
  const { sentences } = useRosterSettings()
  const [index, setIndex] = useState(0)

  // Start at a random index once mounted so the line changes on every refresh.
  // (Hydration-safe: the index initializes to 0 for the server render, only
  // moves to a random value here on the client.)
  useEffect(() => {
    setIndex(Math.floor(Math.random() * Math.max(sentences.length, 1)))
  }, [])

  // Keep the index in range when the pool changes, then rotate on an interval.
  useEffect(() => {
    if (sentences.length <= 1) return
    setIndex((i) => i % sentences.length)
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % sentences.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [sentences.length])

  const line = sentences.length
    ? sentences[index % sentences.length]
    : 'עוד אין משפטים — הוסיפו אחד! ✏️'

  return (
    <Link
      href="/chat"
      className="group flex items-center gap-3 rounded-2xl border-2 border-accent/40 bg-gradient-to-l from-accent/15 to-surface p-4 transition-colors hover:border-accent"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/20 text-2xl shadow-inner">
        🤖
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wide text-accent">{BOT_NAME} על הראש</span>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">AI</span>
        </div>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">{line}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">שאל אותו מי מוביל? ⚽</p>
      </div>
      <span className="shrink-0 rounded-full border border-accent/40 px-3 py-1 text-xs font-semibold text-accent transition-colors group-hover:bg-accent/20">
        דברו איתו
      </span>
    </Link>
  )
}
