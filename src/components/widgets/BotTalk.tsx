'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BOT_NAME } from '@/lib/bot/constants'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'

/** localStorage key holding the position the rotation last showed. */
const COUNTER_KEY = 'bottalk-line-counter'

/**
 * "דבר הבוט" — a prominent, unmissable card showing what the bot is
 * "thinking" right now: a line from the group's banter pool (authored
 * per-member lines + the group's `fun_sentences`). Each page load advances to
 * the NEXT line (no timer, no randomness) — refresh to roll through the pool.
 * Attribution shows who wrote it: the bot or the member who added it.
 * The whole card links into /chat; the ✏️ toggles a small add-only editor.
 */
export function BotTalk() {
  const { ready, sentences, addSentence } = useRosterSettings()
  // `null` until the counter effect runs AND the context has loaded its full
  // sentence pool (user uploads included), so the card never flashes a stale
  // line: `sentences` starts as just the built-in lines and swaps to the full
  // interleaved pool once `fun_sentences` arrives — the same counter index
  // would otherwise land on a different sentence between the two pool sizes.
  const [index, setIndex] = useState<number | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [draft, setDraft] = useState('')

  // Advance one line on every mount (page refresh), cycling through the pool.
  // The counter lives in localStorage so refreshes move forward, not repeat.
  // Hydration-safe: nothing renders a sentence until this runs.
  useEffect(() => {
    const prev = Number(window.localStorage.getItem(COUNTER_KEY) || '-1')
    const next = prev + 1
    window.localStorage.setItem(COUNTER_KEY, String(next))
    setIndex(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current =
    index === null || !ready
      ? null
      : sentences.length
        ? sentences[index % sentences.length]
        : { text: 'עוד אין משפטים — הוסיפו אחד! ✏️', author: '' }

  // Clear writer chip: the bot, a named member, or a plain user upload.
  const authorChip = current
    ? current.author === 'bot'
      ? `🤖 ${BOT_NAME}`
      : current.author
        ? `— ${current.author}`
        : '— משתמש'
    : ''

  async function submit() {
    const text = draft.trim()
    if (!text) return
    await addSentence(text)
    setDraft('')
    // Jump straight to the freshly added line (it lands at the new last index).
    setIndex(sentences.length)
    window.localStorage.setItem(COUNTER_KEY, String(sentences.length))
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Link
          href="/chat"
          className="group flex items-center gap-3 rounded-2xl border-2 border-accent/40 bg-gradient-to-l from-accent/15 to-surface p-4 pl-12 transition-colors hover:border-accent"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/20 text-2xl shadow-inner">
            🤖
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wide text-accent">{BOT_NAME} על הראש</span>
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">AI</span>
            </div>
            {current ? (
              <p className="mt-0.5 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                {current.text}
                {authorChip && <span className="mr-2 text-xs text-muted-foreground">{authorChip}</span>}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs text-muted-foreground">✏️ בצד להוסיף משפט — בלי למחוק של אחרים.</p>
          </div>
          <span className="shrink-0 rounded-full border border-accent/40 px-3 py-1 text-xs font-semibold text-accent transition-colors group-hover:bg-accent/20">
            דברו איתו
          </span>
        </Link>
        <button
          onClick={() => setShowEditor((v) => !v)}
          className="absolute left-2 top-2 z-10 text-xs text-muted-foreground transition-colors hover:text-accent"
          title="הוספת משפט"
        >
          ✏️
        </button>
      </div>

      {showEditor && (
        <div className="rounded-2xl border border-border bg-surface p-3">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
              maxLength={120}
              placeholder="משפט חד וקצר…"
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => void submit()}
              className="shrink-0 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              הוספה
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
