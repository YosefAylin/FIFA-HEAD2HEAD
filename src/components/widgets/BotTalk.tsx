'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, ChevronLeft, ChevronRight, Pause, Play, Plus } from 'lucide-react'
import { BOT_NAME } from '@/lib/bot/constants'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'

/** localStorage key holding the position the rotation last showed. */
const COUNTER_KEY = 'bottalk-line-counter'

/** localStorage key holding whether auto-rotation is on ('1') or off ('0'). */
const AUTO_KEY = 'bottalk-autonext'

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
  // Auto-rotate on/off, persisted so a manual pause survives a refresh. Seeded
  // from localStorage in the mount effect below (hydration-safe).
  const [autoOn, setAutoOn] = useState(true)
  // Bumped on every manual move so the auto-rotate timer restarts instead of
  // firing immediately after an arrow/swipe.
  const [rotateKey, setRotateKey] = useState(0)

  // Swipe gesture tracking — refs only (no per-move re-render). The card itself
  // stays put; a completed swipe simply advances the sentence.
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const swiped = useRef(false)
  // Direction of the last committed swipe — used to key the sentence's slide
  // animation so it enters from the direction it came from.
  const [dir, setDir] = useState<1 | -1>(1)

  // Advance forward one step on mount (page refresh), cycling through the pool.
  // The counter lives in localStorage so refreshes move forward, not repeat.
  // Hydration-safe: nothing renders a sentence until this runs.
  useEffect(() => {
    const prev = Number(window.localStorage.getItem(COUNTER_KEY) || '-1')
    const next = prev + 1
    window.localStorage.setItem(COUNTER_KEY, String(next))
    setPos(next)
    // Default on; only an explicit '0' pauses rotation.
    setAutoOn(window.localStorage.getItem(AUTO_KEY) !== '0')
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
      // Restart the auto-rotate timer so a manual move isn't immediately undone.
      setRotateKey((k) => k + 1)
      setPos((p) => {
        const next = (p ?? 0) + dir
        window.localStorage.setItem(COUNTER_KEY, String(next))
        return next
      })
    },
    []
  )

  // Toggle auto-rotate and persist the choice.
  const toggleAuto = useCallback(() => {
    setAutoOn((v) => {
      const next = !v
      window.localStorage.setItem(AUTO_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  // Auto-rotate: every 20s jump to a random line so all three types (jabs, bot
  // banter, user sentences) surface evenly instead of one sequential pass.
  // Paused when autoOn is off; rotateKey restarts the clock after a manual move.
  useEffect(() => {
    if (len === 0 || !autoOn) return
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
  }, [len, autoOn, rotateKey])

  // --- Swipe handlers (pointer events cover touch + mouse). Only the sentence
  // advances — the card never moves. In RTL: swiping LEFT = next, RIGHT = prev.
  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX
    startY.current = e.clientY
    swiped.current = false
  }

  function onPointerUp(e: React.PointerEvent) {
    if (startX.current === null || startY.current === null) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    startX.current = null
    startY.current = null
    // Ignore vertical scroll gestures and tiny movements (taps).
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return
    const d = dx < 0 ? 1 : -1
    swiped.current = true
    setDir(d)
    go(d)
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
      <div
        className="relative touch-pan-y select-none"
        onPointerDown={onPointerDown}
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
          className="group flex touch-pan-y items-center gap-3 rounded-2xl border-2 border-accent/40 bg-gradient-to-l from-accent/15 to-surface p-4 pl-12 transition-colors hover:border-accent"
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
              <p
                key={`${dir}:${pos}:${current.text}`}
                className={`bot-line-in mt-0.5 text-sm font-medium text-foreground [overflow-wrap:anywhere] ${
                  dir === -1 ? 'bot-line-from-right' : ''
                }`}
              >
                {current.text}
                {authorChip && <span className="mr-2 text-xs text-muted-foreground">{authorChip}</span>}
              </p>
            )}
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
      </div>

      {/* Controls: prev / next + auto-rotate toggle. Kept outside the card's
          <Link> so a tap only moves the sentence, never navigates. In RTL the
          next chevron points left, prev points right (matches swipe mapping). */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setDir(-1)
              go(-1)
            }}
            aria-label="המשפט הקודם"
            title="המשפט הקודם"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setDir(1)
              go(1)
            }}
            aria-label="המשפט הבא"
            title="המשפט הבא"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={toggleAuto}
          aria-pressed={autoOn}
          aria-label={autoOn ? 'כיבוי מעבר אוטומטי' : 'הפעלת מעבר אוטומטי'}
          title={autoOn ? 'כיבוי מעבר אוטומטי' : 'הפעלת מעבר אוטומטי'}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            autoOn
              ? 'border-accent/40 bg-accent/15 text-accent'
              : 'border-border bg-surface text-muted-foreground'
          }`}
        >
          {autoOn ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {autoOn ? 'עצור' : 'הפעל'}
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
