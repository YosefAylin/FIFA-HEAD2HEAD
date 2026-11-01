'use client'

import { useState } from 'react'
import { Check, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TieNames } from '@/components/widgets/TieNames'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { buildRecapShareText, computeWeekRecap } from '@/lib/supabase/recap'
import {
  distinctDayKeys,
  getCurrentTournamentDayKey,
  getSaturdayWeekKey,
} from '@/lib/utils/dateHelpers'
import { copyText } from '@/lib/utils/clipboard'

type Tone = 'champion' | 'loser' | 'sky' | 'orange' | 'green' | 'violet'

const TONE: Record<Tone, { box: string; label: string; icon: string; value: string }> = {
  champion: {
    box: 'border-primary/45 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent',
    label: 'text-primary',
    icon: 'bg-primary/15',
    value: 'text-primary',
  },
  loser: {
    box: 'border-destructive/45 bg-gradient-to-br from-destructive/20 via-orange-500/10 to-transparent',
    label: 'text-destructive',
    icon: 'bg-destructive/15',
    value: 'text-destructive',
  },
  sky: {
    box: 'border-sky-500/30 bg-gradient-to-br from-sky-500/15 to-transparent',
    label: 'text-sky-700 dark:text-sky-300',
    icon: 'bg-sky-500/15',
    value: 'text-sky-600 dark:text-sky-400',
  },
  orange: {
    box: 'border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-transparent',
    label: 'text-orange-700 dark:text-orange-300',
    icon: 'bg-orange-500/15',
    value: 'text-orange-600 dark:text-orange-400',
  },
  green: {
    box: 'border-success/30 bg-gradient-to-br from-success/15 to-transparent',
    label: 'text-success',
    icon: 'bg-success/15',
    value: 'text-success',
  },
  violet: {
    box: 'border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-transparent',
    label: 'text-violet-700 dark:text-violet-300',
    icon: 'bg-violet-500/15',
    value: 'text-violet-600 dark:text-violet-400',
  },
}

/** Compact colored stat inside a hero card. */
function MiniStat({
  value,
  label,
  className = '',
}: {
  value: React.ReactNode
  label: string
  className?: string
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/55 px-2 py-1.5 text-center backdrop-blur-sm">
      <p className={`text-base font-extrabold leading-none tabular-nums ${className}`}>{value}</p>
      <p className="mt-0.5 text-[9px] text-muted-foreground">{label}</p>
    </div>
  )
}

/** The two colored hero cards: winner (gold) and victim (red). */
function HeroCard({
  tone,
  emoji,
  label,
  name,
  nickname,
  tie,
  stats,
}: {
  tone: 'champion' | 'loser'
  emoji: string
  label: string
  name: string
  nickname: string | null
  tie?: string[]
  stats: { value: React.ReactNode; label: string }[]
}) {
  const t = TONE[tone]
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${t.box}`}>
      <span className="pointer-events-none absolute -end-3 -top-5 select-none text-6xl opacity-15">
        {emoji}
      </span>
      <div className="relative flex flex-col items-center gap-1 text-center">
        <span className="text-3xl leading-none">{emoji}</span>
        <p className={`text-[11px] font-bold uppercase tracking-wide ${t.label}`}>{label}</p>
        <p className="text-2xl font-extrabold leading-tight">
          <TieNames name={name} tie={tie} />
        </p>
        {nickname && <p className="text-xs text-muted-foreground">{nickname}</p>}
      </div>
      <div className="relative mt-3 grid grid-cols-3 gap-1.5">
        {stats.map((s) => (
          <MiniStat key={s.label} value={s.value} label={s.label} className={t.value} />
        ))}
      </div>
    </div>
  )
}

/** A colored one-line fact row. */
function FactRow({
  tone,
  emoji,
  title,
  children,
}: {
  tone: Tone
  emoji: string
  title: string
  children: React.ReactNode
}) {
  const t = TONE[tone]
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${t.box}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg ${t.icon}`}>
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
        <div className="text-sm font-semibold leading-tight">{children}</div>
      </div>
    </div>
  )
}

/**
 * The tournament recap, now the first card on the home page: two vivid hero
 * tiles (winner + victim) plus color-coded facts and a copy-to-clipboard line.
 */
export function WeekRecapCard() {
  const { players, matches, loading } = useTournamentData()
  const [copied, setCopied] = useState(false)

  if (loading) return null

  // The recap follows the tournament, not the calendar week: the ongoing day
  // when it has results, otherwise the most recent day that does.
  const days = distinctDayKeys(matches)
  const currentDayKey = getCurrentTournamentDayKey()
  const dayKey = days.includes(currentDayKey) ? currentDayKey : (days[0] ?? null)
  const recap = dayKey
    ? computeWeekRecap(matches, players, getSaturdayWeekKey(new Date(`${dayKey}T12:00:00Z`)), dayKey)
    : computeWeekRecap(matches, players, getSaturdayWeekKey(new Date()))

  if (recap.matchesCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-center text-sm text-muted-foreground">
        עדיין אין משחקים — סיכום הקובה יופיע כאן אחרי המשחק הראשון ⚽
      </div>
    )
  }

  const shareText = buildRecapShareText(recap)

  const onCopy = async () => {
    const ok = await copyText(shareText)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
      {/* Multi-color accent strip — the section reads as a celebration. */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-success to-destructive" />

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">סיכום הטורניר</h2>
              <p className="text-xs text-muted-foreground">{recap.weekLabel}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => void onCopy()}>
            {copied ? (
              <>
                <Check className="h-4 w-4" /> הועתק
              </>
            ) : (
              'העתק סיכום'
            )}
          </Button>
        </div>

        {/* Winner + victim, side by side and color-coded. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recap.champion && (
            <HeroCard
              tone="champion"
              emoji="👑"
              label="אלוף הטורניר"
              name={recap.champion.name}
              nickname={recap.champion.nickname}
              tie={recap.champion.tie}
              stats={[
                { value: recap.champion.points, label: 'נק׳' },
                {
                  value: `${recap.champion.wins}-${recap.champion.draws}-${recap.champion.losses}`,
                  label: 'נ-ת-ה',
                },
                {
                  value: `${recap.champion.goalDifference > 0 ? '+' : ''}${recap.champion.goalDifference}`,
                  label: 'פרשים',
                },
              ]}
            />
          )}
          {recap.loser && recap.loser.losses > 0 && (
            <HeroCard
              tone="loser"
              emoji="🥃"
              label="חייב וויסקי"
              name={recap.loser.name}
              nickname={recap.loser.nickname}
              tie={recap.loser.tie}
              stats={[
                { value: recap.loser.losses, label: 'הפסדים' },
                {
                  value: `${recap.loser.wins}-${recap.loser.draws}-${recap.loser.losses}`,
                  label: 'נ-ת-ה',
                },
                { value: recap.loser.goalsFor, label: 'שערים' },
              ]}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          {recap.technicalWin && (
            <FactRow tone="sky" emoji="🎯" title="ניצחון טכני (הפרש 3+)">
              {recap.technicalWin.label}
              <span className="font-normal text-muted-foreground"> — {recap.technicalWin.margin} שערים</span>
            </FactRow>
          )}
          {recap.roundWin && (
            <FactRow tone="violet" emoji="🔁" title="סבב — ניצח את כל השחקנים">
              <TieNames name={recap.roundWin.name} tie={recap.roundWin.tie} />
            </FactRow>
          )}
          {recap.longestStreak && recap.longestStreak.length >= 2 && (
            <FactRow tone="orange" emoji="🔥" title="הרצף הארוך של הטורניר">
              <TieNames name={recap.longestStreak.name} tie={recap.longestStreak.tie} />
              <span className="font-normal text-muted-foreground"> — {recap.longestStreak.length} ניצחונות ברצף</span>
            </FactRow>
          )}
          {recap.activeStreak &&
            recap.activeStreak.length >= 2 &&
            (recap.activeStreak.name !== recap.longestStreak?.name ||
              recap.activeStreak.length !== recap.longestStreak?.length) && (
              <FactRow tone="green" emoji="⚡" title="רצף פעיל">
                <TieNames name={recap.activeStreak.name} tie={recap.activeStreak.tie} />
                <span className="font-normal text-muted-foreground"> — {recap.activeStreak.length} ניצחונות ברצף</span>
              </FactRow>
            )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
          <span className="font-semibold">{recap.matchesCount} משחקים</span>
          <span className="text-muted-foreground">{recap.totalGoals} שערים</span>
        </div>
      </div>
    </div>
  )
}
