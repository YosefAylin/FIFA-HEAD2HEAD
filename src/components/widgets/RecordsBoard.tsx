'use client'

import { useMemo, useState } from 'react'
import { ArrowDownRight, Check, Clock, Crown, Flame, Share2, Snowflake, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TieNames } from '@/components/widgets/TieNames'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { computeCareerRecords } from '@/lib/supabase/stats'
import { copyText } from '@/lib/utils/clipboard'

/** Share-text holder (kept inline "A = B = C" so the copied text reads flat). */
function shareHolder(name: string, tie?: string[]): string {
  return tie && tie.length ? [name, ...tie].join(' = ') : name
}

type Tone = 'good' | 'bad'

const TONE_BOX: Record<Tone, string> = {
  good: 'border-success/30 bg-gradient-to-br from-success/10 to-transparent',
  bad: 'border-destructive/25 bg-gradient-to-br from-destructive/10 to-transparent',
}
const TONE_ICON: Record<Tone, string> = {
  good: 'bg-success/15 text-success',
  bad: 'bg-destructive/15 text-destructive',
}
const TONE_VALUE: Record<Tone, string> = {
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

/** Horizontal record row: icon, title + holder, big value on the end. */
function RecordRow({
  icon,
  tone,
  title,
  holder,
  value,
  unit,
  index,
}: {
  icon: React.ReactNode
  tone: Tone
  title: string
  holder: React.ReactNode
  value: React.ReactNode
  unit: string
  index: number
}) {
  return (
    <div
      className={`rise-in flex items-center gap-3 rounded-2xl border p-4 ${TONE_BOX[tone]}`}
      style={{ '--i': index } as React.CSSProperties}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONE_ICON[tone]}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
        <div className="text-base leading-tight">{holder}</div>
      </div>
      <span className="flex shrink-0 flex-col items-center">
        <span className={`text-3xl font-extrabold leading-none tabular-nums ${TONE_VALUE[tone]}`}>{value}</span>
        <span className="mt-0.5 text-[10px] text-muted-foreground">{unit}</span>
      </span>
    </div>
  )
}

/**
 * Career records + all-time champion trophy cabinet, powered entirely by
 * client-side data. A hero crown for the all-time #1, then two groups: the
 * winning streak (the gold), and the "wall of shame" — most losses and the
 * longest miserable runs.
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

  const hasShame = Boolean(records.mostLosses || records.longestLossStreak || records.longestWinlessStreak)

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
            <StatPill value={`${champion.goalDifference > 0 ? '+' : ''}${champion.goalDifference}`} label="פרשים" />
            <StatPill value={champion.matches} label="משחקים" />
          </div>
        )}
      </div>

      {records.currentWinStreak && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
            <Flame className="h-4 w-4 text-success" /> רצף פעיל 🔥
          </h2>
          <RecordRow
            index={0}
            tone="good"
            icon={<Flame className="h-5 w-5" />}
            title="הרצף הפעיל הכי ארוך"
            holder={<TieNames name={records.currentWinStreak.name} tie={records.currentWinStreak.tie} />}
            value={records.currentWinStreak.length}
            unit="ברצף"
          />
        </section>
      )}

      {hasShame && (
        <section className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
            <TrendingDown className="h-4 w-4 text-destructive" /> קיר הבושה
          </h2>
          {records.mostLosses && (
            <RecordRow
              index={0}
              tone="bad"
              icon={<TrendingDown className="h-5 w-5" />}
              title="הכי הרבה הפסדים"
              holder={<TieNames name={records.mostLosses.name} tie={records.mostLosses.tie} />}
              value={records.mostLosses.losses}
              unit="הפסדים"
            />
          )}
          {records.longestLossStreak && (
            <RecordRow
              index={1}
              tone="bad"
              icon={<ArrowDownRight className="h-5 w-5" />}
              title="רצף הפסדים"
              holder={<TieNames name={records.longestLossStreak.name} tie={records.longestLossStreak.tie} />}
              value={records.longestLossStreak.length}
              unit="ברצף"
            />
          )}
          {records.longestWinlessStreak && (
            <RecordRow
              index={2}
              tone="bad"
              icon={<Snowflake className="h-5 w-5" />}
              title="הכי הרבה בלי ניצחון"
              holder={<TieNames name={records.longestWinlessStreak.name} tie={records.longestWinlessStreak.tie} />}
              value={records.longestWinlessStreak.length}
              unit="משחקים"
            />
          )}
        </section>
      )}

      {!champion && !records.currentWinStreak && !hasShame && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-12 text-center">
          <p className="text-3xl">🏆</p>
          <p className="mt-2 text-sm text-muted-foreground">אין עדיין שיאים — רשמו את המשחק הראשון ופתחו את ארון הגביעים!</p>
        </div>
      )}
    </div>
  )
}
