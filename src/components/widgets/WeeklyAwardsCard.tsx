'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { TieNames } from '@/components/widgets/TieNames'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { computeWeekRecap, computeWeeklyAwards, recentMatchWeeks } from '@/lib/supabase/recap'
import { formatWeekKey } from '@/lib/utils/dateHelpers'
import type { WeeklyAwards } from '@/lib/supabase/recap'

/** The Saturday before the given week key. */
function prevWeekKey(weekKey: string): string {
  const d = new Date(`${weekKey}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 7)
  return d.toISOString().slice(0, 10)
}

function Row({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <span className="text-xl leading-none">{emoji}</span>
      <span className="text-sm">
        <span className="font-semibold">{title} — </span>
        <span className="text-muted-foreground">{children}</span>
      </span>
    </li>
  )
}

/**
 * Weekly awards card — shows for the most recent week that actually had matches,
 * so it's visible even during a quiet week: last week's champion, the best win
 * ratio, and the surprise of the week (biggest jump over the pecking order).
 */
export function WeeklyAwardsCard() {
  const { players, matches, loading } = useTournamentData()

  const data = useMemo<{
    weekKey: string | null
    prevChampion: ReturnType<typeof computeWeekRecap>['champion']
    awards: WeeklyAwards | null
  }>(() => {
    const [wk] = recentMatchWeeks(matches, 1)
    if (!wk) return { weekKey: null, prevChampion: null, awards: null }
    const prev = computeWeekRecap(matches, players, prevWeekKey(wk))
    return { weekKey: wk, prevChampion: prev.champion, awards: computeWeeklyAwards(matches, players, wk) }
  }, [matches, players])

  if (loading || !data.weekKey || !data.awards) return null
  const { prevChampion, awards } = data
  if (!prevChampion && !awards.bestRatio && !awards.surprise) return null

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-lg font-bold">
          <Sparkles className="h-4 w-4 text-primary" /> פרסי השבוע
        </h2>
        <span className="text-xs text-muted-foreground">{formatWeekKey(data.weekKey)}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {prevChampion && (
          <Row emoji="🏆" title="אלוף השבוע שעבר">
            <TieNames name={prevChampion.name} tie={prevChampion.tie} /> עם {prevChampion.points} נק׳
          </Row>
        )}
        {awards.bestRatio && (
          <Row emoji="📈" title="היחס הטוב ביותר">
            <TieNames name={awards.bestRatio.name} tie={awards.bestRatio.tie} /> עם{' '}
            {Math.round(awards.bestRatio.winPercentage)}% ניצחון
          </Row>
        )}
        {awards.surprise && (
          <Row emoji="😮" title="הפתעת השבוע">
            <span className="font-semibold text-foreground">{awards.surprise.name}</span> — מקום{' '}
            {awards.surprise.actual} (צפוי {awards.surprise.expected}), {awards.surprise.points} נק׳
          </Row>
        )}
      </ul>
    </section>
  )
}
