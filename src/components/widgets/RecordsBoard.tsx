'use client'

import { useMemo, useState } from 'react'
import { ArrowDownRight, Check, Clock, Crown, Flame, Gamepad2, Share2, Snowflake, TrendingDown, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TieNames } from '@/components/widgets/TieNames'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { computeCareerRecords } from '@/lib/supabase/stats'
import { rosterFor } from '@/lib/data/roster'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

/** Share-text holder (kept inline "A = B = C" so the copied text reads flat). */
function shareHolder(name: string, tie?: string[]): string {
  return tie && tie.length ? [name, ...tie].join(' = ') : name
}

type Tone = 'gold' | 'good' | 'bad'

const TONE_BOX: Record<Tone, string> = {
  gold: 'border-primary/40 bg-gradient-to-br from-primary/15 to-transparent',
  good: 'border-success/30 bg-success/5',
  bad: 'border-destructive/30 bg-destructive/5',
}
const TONE_ICON: Record<Tone, string> = {
  gold: 'bg-primary/15 text-primary',
  good: 'bg-success/15 text-success',
  bad: 'bg-destructive/15 text-destructive',
}
const TONE_VALUE: Record<Tone, string> = {
  gold: 'text-primary',
  good: 'text-success',
  bad: 'text-destructive',
}

function StatPill({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-center backdrop-blur-sm">
      <p className="text-lg font-extrabold leading-none tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

function RecordCard({
  icon,
  tone,
  title,
  value,
  unit,
  holder,
  sub,
  wide = false,
}: {
  icon: React.ReactNode
  tone: Tone
  title: string
  value: React.ReactNode
  unit: string
  holder: React.ReactNode
  sub?: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className={`rise-in flex flex-col gap-3 rounded-2xl border p-4 ${TONE_BOX[tone]} ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONE_ICON[tone]}`}>{icon}</span>
        <span className="flex items-baseline gap-1">
          <span className={`text-3xl font-extrabold leading-none tabular-nums ${TONE_VALUE[tone]}`}>{value}</span>
          <span className="text-xs font-medium text-muted-foreground">{unit}</span>
        </span>
      </div>
      <div className="mt-auto">
        <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
        <div className="text-base leading-tight">{holder}</div>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

/**
 * Career records + all-time champion trophy cabinet, powered entirely by
 * client-side data: a hero crown for the all-time #1, then a bento of the
 * biggest win and the group's streaks/records, plus a tappable share button.
 */
export function RecordsBoard() {
  const { players, matches, loading } = useTournamentData()
  const [copied, setCopied] = useState(false)

  const records = useMemo(() => computeCareerRecords(matches, players), [matches, players])

  if (loading) return <p className="py-10 text-center text-muted-foreground">טוען…</p>

  const champion = records.overallChampion

  const shareText = champion
    ? `👑 אלוף כל הזמנים בקובה: ${shareHolder(champion.name, champion.tie)} עם ${champion.points} נק׳ (פרשים ${champion.goalDifference > 0 ? '+' : ''}${champion.goalDifference})`
    : 'עדיין אין נתונים כדי להכתיר אלוף כל הזמנים 😅'

  const onCopy = async () => {
    const ok = await copyText(shareText)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const hasRecords = Boolean(
    records.biggestWin ||
      records.longestStreak ||
      records.mostLosses ||
      records.longestLossStreak ||
      records.longestWinlessStreak ||
      records.mostMatches
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Trophy cabinet */}
      <div className="rise-in relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-primary/5 to-accent/10 p-5">
        <div className="shine-sweep pointer-events-none absolute inset-y-0 start-1/4 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/20 text-primary">
              {champion ? <Crown className="h-7 w-7" /> : <Clock className="h-7 w-7 text-muted-foreground" />}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground">אלוף כל הזמנים</p>
              {champion ? (
                <p className="text-2xl font-extrabold leading-tight">
                  <TieNames name={champion.name} tie={champion.tie} />
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">אין עדיין מספיק משחקים כדי להכתיר אלוף</p>
              )}
            </div>
          </div>
          {champion && (
            <Button size="sm" variant="outline" onClick={() => void onCopy()}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> הועתק
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" /> שיתוף
                </>
              )}
            </Button>
          )}
        </div>

        {champion && (
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <StatPill value={champion.points} label="נקודות" />
            <StatPill
              value={`${champion.goalDifference > 0 ? '+' : ''}${champion.goalDifference}`}
              label="פרשים"
            />
            <StatPill value={champion.matches} label="משחקים" />
          </div>
        )}
      </div>

      {/* Records bento */}
      {hasRecords ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {records.biggestWin && (
            <RecordCard
              wide
              tone="gold"
              icon={<Zap className="h-5 w-5" />}
              title="הניצחון הכי גדול"
              value={records.biggestWin.margin}
              unit="שערים"
              holder={<span className="font-semibold">{records.biggestWin.winnerName}</span>}
              sub={records.biggestWin.label}
            />
          )}
          {records.longestStreak && (
            <RecordCard
              wide
              tone="good"
              icon={<Flame className="h-5 w-5" />}
              title="רצף ניצחונות"
              value={records.longestStreak.length}
              unit="ברצף"
              holder={<TieNames name={records.longestStreak.name} tie={records.longestStreak.tie} />}
            />
          )}
          {records.mostMatches && (
            <RecordCard
              tone="good"
              icon={<Gamepad2 className="h-5 w-5" />}
              title="הכי הרבה משחקים"
              value={records.mostMatches.matches}
              unit="משחקים"
              holder={<TieNames name={records.mostMatches.name} tie={records.mostMatches.tie} />}
            />
          )}
          {records.mostLosses && (
            <RecordCard
              tone="bad"
              icon={<TrendingDown className="h-5 w-5" />}
              title="הכי הרבה הפסדים"
              value={records.mostLosses.losses}
              unit="הפסדים"
              holder={<TieNames name={records.mostLosses.name} tie={records.mostLosses.tie} />}
            />
          )}
          {records.longestLossStreak && (
            <RecordCard
              tone="bad"
              icon={<ArrowDownRight className="h-5 w-5" />}
              title="רצף הפסדים"
              value={records.longestLossStreak.length}
              unit="ברצף"
              holder={<TieNames name={records.longestLossStreak.name} tie={records.longestLossStreak.tie} />}
            />
          )}
          {records.longestWinlessStreak && (
            <RecordCard
              tone="bad"
              icon={<Snowflake className="h-5 w-5" />}
              title="בלי ניצחון"
              value={records.longestWinlessStreak.length}
              unit="משחקים"
              holder={<TieNames name={records.longestWinlessStreak.name} tie={records.longestWinlessStreak.tie} />}
            />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-12 text-center">
          <p className="text-3xl">🏆</p>
          <p className="mt-2 text-sm text-muted-foreground">אין עדיין שיאים — רשמו את המשחק הראשון ופתחו את ארון הגביעים!</p>
        </div>
      )}
    </div>
  )
}
