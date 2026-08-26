'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BOT_NAME } from '@/lib/bot/constants'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'

/** localStorage key holding the position the rotation last showed. */
const COUNTER_KEY = 'bottalk-line-counter'

/**
 * "דבר הבוט" — the club's running banter line from the group pool. Refreshing
 * or tapping advances to the next line. The whole strip links into /chat.
 */
export function BotTalk() {
  const { ready, sentences, addSentence } = useRosterSettings()
  const [index, setIndex] = useState<number | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [draft, setDraft] = useState('')

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
        : { text: 'עוד אין משפטים — הוסיפו אחד!', author: '' }

  const authorChip = current?.author === 'bot' ? BOT_NAME : 'לא ידוע'

  async function submit() {
    const text = draft.trim()
    if (!text) return
    await addSentence(text)
    setDraft('')
    setIndex(sentences.length)
    window.localStorage.setItem(COUNTER_KEY, String(sentences.length))
  }

  function nextLine() {
    const idx = index ?? 0
    setIndex(idx + 1)
    window.localStorage.setItem(COUNTER_KEY, String(idx + 1))
  }

  return (
    <div className="rise-1">
      <div className="relative flex items-center gap-3 border-y border-lines py-4">
        <Link href="/chat" className="group flex flex-1 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-lg leading-none text-gold-ink" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d="M6 3.5h8v3a4 4 0 0 1-8 0v-3Z" strokeLinejoin="round" />
              <path d="M10 10.5v3.5M7.5 16h5" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold tracking-wide text-gold">{BOT_NAME} על הראש</span>
            {current ? (
              <p key={index} className="bot-line-in mt-0.5 text-[15px] font-medium leading-snug text-ink [overflow-wrap:anywhere]">
                {current.text}
                <span className="ml-1 text-ink-faint"> · {authorChip}</span>
              </p>
            ) : null}
          </div>
          <span className="shrink-0 text-xs text-gold opacity-0 transition-opacity group-hover:opacity-100">
            לפתוח
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={nextLine}
            aria-label="המשפט הבא"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-mid transition-colors hover:bg-raised hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M12 3.5 7 10l5 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowEditor((v) => !v)}
            aria-label="הוספת משפט"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-mid transition-colors hover:bg-raised hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {showEditor && (
        <div className="panel mb-4 mt-3 p-3">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit()
              }}
              maxLength={120}
              placeholder="משפט חד וקצר…"
              className="min-w-0 flex-1 rounded-xl border border-lines bg-raised/50 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
            />
            <button
              onClick={() => void submit()}
              className="shrink-0 rounded-full bg-gold px-3 text-sm font-semibold text-gold-ink transition-colors hover:bg-gold-deep"
            >
              הוספה
            </button>
          </div>
        </div>
      )}
    </div>
  )
}