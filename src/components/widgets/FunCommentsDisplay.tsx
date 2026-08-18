'use client'

import { useEffect, useState } from 'react'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'

const INTERVAL_MS = 25000

/** Rotating banter banner (built-in + user-added sentences) with a small editor. */
export function FunCommentsDisplay() {
  const { sentences, userSentences, addSentence, removeSentence } = useRosterSettings()
  const [index, setIndex] = useState(0)
  const [showEditor, setShowEditor] = useState(false)
  const [draft, setDraft] = useState('')

  // Keep index in range when the pool changes.
  useEffect(() => {
    setIndex((i) => (sentences.length ? i % sentences.length : 0))
  }, [sentences.length])

  useEffect(() => {
    if (sentences.length <= 1) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % sentences.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [sentences.length])

  const current = sentences.length ? sentences[index % sentences.length] : 'עוד אין משפטים — הוסיפו אחד! ✏️'

  async function submit() {
    const text = draft.trim()
    if (!text) return
    await addSentence(text)
    setDraft('')
    setIndex(sentences.length) // jump straight to the freshly added one
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-center">
        <p className="text-base font-medium text-accent">{current}</p>
        <button
          onClick={() => setShowEditor((v) => !v)}
          className="absolute left-2 top-2 text-xs text-muted-foreground transition-colors hover:text-accent"
          title="הוספת משפט"
        >
          ✏️
        </button>
      </div>

      {showEditor && (
        <div className="rounded-xl border border-border bg-surface p-3">
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
                <li key={s} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>{s}</span>
                  <button
                    onClick={() => void removeSentence(s)}
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
