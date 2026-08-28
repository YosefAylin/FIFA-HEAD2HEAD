'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, Plus } from 'lucide-react'
import { BOT_NAME } from '@/lib/bot/constants'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'

/** localStorage key holding the position the rotation last showed. */
const COUNTER_KEY = 'bottalk-line-counter'

/** Auto-rotation cadence (ms) — the card advances to a random line every 20s. */
const ROTATE_MS = 20_000

/** Horizontal drag (px) past which a swipe commits to next/prev instead of snapping back. */
const SWIPE_THRESHOLD = 40

/**
 * "דבר הבוט" — a prominent, unmissable card showing what the bot is
 * "thinking" right now: a line from the group's banter pool (jabs + bot banter +
 * user sentences). Swipe the card left/right to move through the pool (RTL:
 * swipe left = forward, swipe right = back), and it auto-advances to a RANDOM
 * line every 20s so all three line types surface evenly. Each page load advances
 * forward from the last-shown position.
 * The whole card links into /chat; the ➕ toggles a small add-only editor.
 */
export function BotTalk() {
  const { ready, sentences, addSentence } = useRosterSettings()
  // Absolute position in the (circular) pool. Seeded from localStorage once the
  // context has loaded its full pool so the card never flashes a stale line.
  const [pos, setPos] = useState<number | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [draft, setDraft] = useState('')

  // Drag state for swipe gestures (pointer/touch + mouse).
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStartX = useRef<number | null>(null)
  const swiped = useRef(false)

  // Advance forward one step on mount (page refresh), cycling through the pool.
  // The counter lives in localStorage so refreshes move forward, not repeat.
  // Hydration-safe: nothing renders a sentence until this runs.
  useEffect(() => {
    const prev = Number(window.localStorage.getItem(COUNTER_KEY) || '-1')
    const next = prev + 1
    window.localStorage.setItem(COUNTER_KEY, String(next))
    setPos(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const len = sentences.length

  // Normalize a possibly-negative absolute position into a pool index.
  const norm = (n: number) => ((n % len) + len) % len
  const readyCurrent =
    pos !== null && ready && len > 0 ? sentences[norm(pos)] : null
  const current = readyCurrent ?? { text: 'עוד אין משפטים — הוסיפו אחד! ✏️', author: '' }

  // Writer chip: only bot-authored lines get a marker (roster jabs, the daily
  // AI-generated line — all stored as `author: BOT_NAME`); player jabs and
  // plain uploads show 'לא ידוע' so the board reads as user inputs + AI banter.
  const authorChip = current?.author === BOT_NAME ? `🤖 ${BOT_NAME}` : 'לא ידוע'

  // Set the absolute position and persist it so a page refresh keeps moving from
  // the last line shown (rather than repeating it).
  const commit = useCallback((next: number) => {
    setPos(next)
    window.localStorage.setItem(COUNTER_KEY, String(next))
  }, [])

  const go = useCallback(
    (dir: 1 | -1) => {
      setPos((p) => {
        const next = (p ?? 0) + dir
        window.localStorage.setItem(COUNTER_KEY, String(next))
        return next
      })
    },
    []
  )

  // Auto-rotate: every 20s jump to a random line so all three types (jabs, bot
  // banter, user sentences) surface evenly instead of one sequential pass.
  useEffect(() => {
    if (len === 0) return
    const t = window.setInterval(() => {
      setPos((p) => {
        const base = p ?? 0
        // Pick a random offset that actually changes the shown line.
        const offset = 1 + Math.floor(Math.random() * (len - 1))
        const next = base + offset
        window.localStorage.setItem(COUNTER_KEY, String(next))
        return next
      })
    }, ROTATE_MS)
    return () => window.clearInterval(t)
  }, [len])

  // --- Swipe handlers (pointer events cover touch + mouse) ---
  function onPointerDown(e: React.PointerEvent) {
    dragStartX.current = e.clientX
    swiped.current = false
    setDragX(0)
    setDragging(true)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || dragStartX.current === null) return
    const dx = e.clientX - dragStartX.current
    setDragX(dx)
  }

  function onPointerUp() {
    if (!dragging || dragStartX.current === null) {
      setDragging(false)
      setDragX(0)
      return
    }
    const dx = dragX
    dragStartX.current = null
    setDragging(false)
    setDragX(0)
    if (Math.abs(dx) < SWIPE_THRESHOLD) return // tap — let the Link navigate
    swiped.current = true
    // RTL: swiping LEFT (negative dx) = next, RIGHT (positive dx) = previous.
    go(dx < 0 ? 1 : -1)
  }

  async function submit() {
    const text = draft.trim()
    if (!text) return
    await addSentence(text)
    setDraft('')
    // Jump straight to the freshly added line (it lands at the new last index).
    commit(len)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <div
          className="touch-pan-y select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <Link
            href="/chat"
            onClick={(e) => {
              // A swipe shouldn't navigate — swallow the click that follows it.
              if (swiped.current) {
                swiped.current = false
                e.preventDefault()
              }
            }}
            className="group flex items-center gap-3 rounded-2xl border-2 border-accent/40 bg-gradient-to-l from-accent/15 to-surface p-4 pl-12 transition-colors hover:border-accent"
            style={{
              transform: dragging ? `translateX(${dragX}px)` : undefined,
              transition: dragging ? 'none' : 'transform 200ms ease, border-color 200ms ease, background 200ms ease',
            }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/20 shadow-inner">
              <Bot className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide text-accent">{BOT_NAME} על הראש</span>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">AI</span>
              </div>
              {pos !== null && ready && (
                <p className="mt-0.5 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                  {current.text}
                  {authorChip && <span className="mr-2 text-xs text-muted-foreground">{authorChip}</span>}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-full border border-accent/40 px-3 py-1 text-xs font-semibold text-accent transition-colors group-hover:bg-accent/20">
              דברו איתו
            </span>
          </Link>
        </div>
        <button
          onClick={() => setShowEditor((v) => !v)}
          className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground transition-colors hover:bg-accent/90"
          title="הוספת משפט"
        >
          <Plus className="h-3.5 w-3.5" />
          הוספת משפט
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
