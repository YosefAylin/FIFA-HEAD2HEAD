'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bot, Plus, SkipForward } from 'lucide-react'
import { BOT_NAME } from '@/lib/bot/constants'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'

/** localStorage key holding the position the rotation last showed. */
const COUNTER_KEY = 'bottalk-line-counter'

/**
 * "דבר הבוט" — a prominent, unmissable card showing what the bot is
 * "thinking" right now: a line from the group's banter pool (authored
 * per-member lines + the group's `fun_sentences`). Each page load advances to
 * the NEXT line (no timer, no randomness) — refresh to roll through the pool.
 * Attribution: only bot-authored lines show a marker; player jabs and plain
 * uploads display unmarked so the board reads as inputs + AI banter.
 * The whole card links into /chat; the ➕ toggles a small add-only editor.
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

  // The live, data-grounded line (index 0) is the fresh "reminder" — lead with
  // it on a fresh page load, then fall through the rotation.
  const current =
    index === null || !ready
      ? null
      : sentences.length
        ? index === 0
          ? sentences[0]
          : sentences[index % sentences.length]
        : { text: 'עוד אין משפטים — הוסיפו אחד! ✏️', author: '' }

  // Writer chip: only bot-authored lines get a marker (roster jabs, the daily
  // AI-generated line — all stored as `author: BOT_NAME`); player jabs and
  // plain uploads show 'לא ידוע' so the board reads as user inputs + AI banter.
  const authorChip = current?.author === BOT_NAME ? `🤖 ${BOT_NAME}` : 'לא ידוע'

  async function submit() {
    const text = draft.trim()
    if (!text) return
    await addSentence(text)
    setDraft('')
    // Jump straight to the freshly added line (it lands at the new last index).
    setIndex(sentences.length)
    window.localStorage.setItem(COUNTER_KEY, String(sentences.length))
  }

  // Advance the card to the next sentence on demand (and persist the counter
  // so the page-refresh rotation stays consistent with manual taps).
  function nextLine() {
    const idx = index ?? 0
    setIndex(idx + 1)
    window.localStorage.setItem(COUNTER_KEY, String(idx + 1))
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Link
          href="/chat"
          className="group flex items-center gap-3 rounded-2xl border-2 border-accent/40 bg-gradient-to-l from-accent/15 to-surface p-4 pl-12 transition-colors hover:border-accent"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/20 shadow-inner">
            <Bot className="h-6 w-6" />
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
          </div>
          <span className="shrink-0 rounded-full border border-accent/40 px-3 py-1 text-xs font-semibold text-accent transition-colors group-hover:bg-accent/20">
            דברו איתו
          </span>
        </Link>
        <button
          onClick={() => setShowEditor((v) => !v)}
          className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground transition-colors hover:bg-accent/90"
          title="הוספת משפט"
        >
          <Plus className="h-3.5 w-3.5" />
          הוספת משפט
        </button>
        {sentences.length > 0 && (
          <button
            type="button"
            onClick={nextLine}
            className="absolute left-2 top-9 z-10 inline-flex items-center rounded-full border border-accent/40 px-2 py-0.5 text-accent transition-colors hover:bg-accent/20"
            title="המשפט הבא"
          >
            <SkipForward className="h-3.5 w-3.5 rtl:-scale-x-100" />
          </button>
        )}
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
