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
 * The whole card links into /chat; the ✏️ toggles a small add/remove editor.
 */
export function BotTalk() {
  const { sentences, userSentences, addSentence, removeSentence } = useRosterSettings()
  const [index, setIndex] = useState(0)
  const [showEditor, setShowEditor] = useState(false)
  const [draft, setDraft] = useState('')

  // Advance one line on every mount (page refresh), cycling through the pool.
  // The counter lives in localStorage so refreshes move forward, not repeat.
  // (Hydration-safe: index starts at 0 for the server render, only moves here.)
  useEffect(() => {
    const prev = Number(window.localStorage.getItem(COUNTER_KEY) || '-1')
    const next = prev + 1
    window.localStorage.setItem(COUNTER_KEY, String(next))
    setIndex(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = sentences.length
    ? sentences[index % sentences.length]
    : { text: 'עוד אין משפטים — הוסיפו אחד! ✏️', author: '' }

  // Attribution shown beside a line: the writer's name, or the bot.
  const authorLabel =
    current.author === 'bot' ? `🤖 ${BOT_NAME}` : current.author ? `— ${current.author}` : ''

  async function submit() {
    const text = draft.trim()
    if (!text) return
    await addSentence(text)
    setDraft('')
    // Jump straight to the freshly added line (it lands at the new last index).
    const next = sentences.length
    setIndex(next)
    window.localStorage.setItem(COUNTER_KEY, String(next))
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
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">
              {current.text}
              {authorLabel && <span className="mr-2 text-xs text-muted-foreground">{authorLabel}</span>}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">שאל אותו מי מוביל? ⚽</p>
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
          {userSentences.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {userSentences.map((s) => (
                <li key={s.text} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>
                    {s.text}
                    {s.author && <span className="mr-2 text-xs">{`— ${s.author}`}</span>}
                  </span>
                  <button
                    onClick={() => void removeSentence(s.text)}
                    className="text-xs text-destructive"
                    title="מחיקה"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
