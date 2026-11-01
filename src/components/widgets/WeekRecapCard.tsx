'use client'

import { useState } from 'react'
import { Check, Trophy } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
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

/** Restrained accents: one gold rule for the winner, one red rule for the debt. */
const HERO_ACCENT = {
  champion: { label: 'text-primary', rule: 'bg-primary/70' },
  loser: { label: 'text-destructive', rule: 'bg-destructive/60' },
} as const

/** Compact stat inside a hero card — neutral, typography-led. */
function MiniStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-center">
      <p className="text-base font-extrabold leading-none tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[9px] text-muted-foreground">{label}</p>
    </div>
  )
}

/** Winner / loser hero: photo-led, neutral surface, one thin accent rule. */
function HeroCard({
  tone,
  label,
  name,
  nickname,
  photo,
  tie,
  stats,
}: {
  tone: 'champion' | 'loser'
  label: string
  name: string
  nickname: string | null
  photo: string | null
  tie?: string[]
  stats: { value: React.ReactNode; label: string }[]
}) {
  const accent = HERO_ACCENT[tone]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-background/40 p-4">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${accent.rule}`} />
      <div className="flex flex-col items-center gap-1.5 text-center">
        <Avatar name={name} src={photo} size="xl" />
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${accent.label}`}>{label}</p>
        <p className="text-2xl font-extrabold leading-tight">
          <TieNames name={name} tie={tie} />
        </p>
        {nickname && <p className="text-xs text-muted-foreground">{nickname}</p>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {stats.map((s) => (
          <MiniStat key={s.label} value={s.value} label={s.label} />
        ))}
      </div>
    </div>
  )
}

/** Quiet fact row, led by the relevant player's photo. */
function FactRow({
  name,
  photo,
  title,
  children,
}: {
  name: string
  photo: string | null
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Avatar name={name} src={photo} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
        <div className="text-sm font-semibold leading-tight">{children}</div>
      </div>
    </div>
  )
}

/**
 * The tournament recap: a photo-led winner/loser pair, then a quiet list of
 * facts and a copy-to-clipboard line.
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

  const photoFor = (name: string | null | undefined) =>
    name ? (players.find((p) => p.name === name)?.profile_picture_url ?? null) : null

  const shareText = buildRecapShareText(recap)

  const onCopy = async () => {
    const ok = await copyText(shareText)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold leading-tight">סיכום הטורניר</h2>
              <p className="text-xs text-muted-foreground">{recap.weekLabel}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void onCopy()}>
            {copied ? (
              <>
                <Check className="h-4 w-4" /> הועתק
              </>
            ) : (
              'העתק סיכום'
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recap.champion && (
            <HeroCard
              tone="champion"
              label="אלוף הטורניר"
              name={recap.champion.name}
              nickname={recap.champion.nickname}
              photo={photoFor(recap.champion.name)}
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
              label="חייב וויסקי"
              name={recap.loser.name}
              nickname={recap.loser.nickname}
              photo={photoFor(recap.loser.name)}
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

        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-background/30">
          {recap.mostTechnical && (
            <FactRow
              name={recap.mostTechnical.name}
              photo={photoFor(recap.mostTechnical.name)}
              title="הכי הרבה טכני (הפרש 3+)"
            >
              <TieNames name={recap.mostTechnical.name} tie={recap.mostTechnical.tie} />
              <span className="font-normal text-muted-foreground"> — {recap.mostTechnical.count} ניצחונות</span>
              {recap.technicalWin && (
                <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                  הגדול: {recap.technicalWin.label} ({recap.technicalWin.margin} שערים)
                </span>
              )}
            </FactRow>
          )}
          {recap.mostRounds && (
            <FactRow
              name={recap.mostRounds.name}
              photo={photoFor(recap.mostRounds.name)}
              title="הכי הרבה סבבים"
            >
              <TieNames name={recap.mostRounds.name} tie={recap.mostRounds.tie} />
              <span className="font-normal text-muted-foreground"> — {recap.mostRounds.count} סבבים</span>
            </FactRow>
          )}
          {recap.longestStreak && recap.longestStreak.length >= 2 && (
            <FactRow
              name={recap.longestStreak.name}
              photo={photoFor(recap.longestStreak.name)}
              title="הרצף הארוך של הטורניר"
            >
              <TieNames name={recap.longestStreak.name} tie={recap.longestStreak.tie} />
              <span className="font-normal text-muted-foreground"> — {recap.longestStreak.length} ניצחונות ברצף</span>
            </FactRow>
          )}
          {recap.activeStreak &&
            recap.activeStreak.length >= 2 &&
            (recap.activeStreak.name !== recap.longestStreak?.name ||
              recap.activeStreak.length !== recap.longestStreak?.length) && (
              <FactRow
                name={recap.activeStreak.name}
                photo={photoFor(recap.activeStreak.name)}
                title="רצף פעיל"
              >
                <TieNames name={recap.activeStreak.name} tie={recap.activeStreak.tie} />
                <span className="font-normal text-muted-foreground"> — {recap.activeStreak.length} ניצחונות ברצף</span>
              </FactRow>
            )}
        </div>

        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>{recap.matchesCount} משחקים</span>
          <span>{recap.totalGoals} שערים</span>
        </div>
      </div>
    </div>
  )
}
