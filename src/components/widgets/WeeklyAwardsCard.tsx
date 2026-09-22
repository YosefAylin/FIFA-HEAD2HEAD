'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { TieNames } from '@/components/widgets/TieNames'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { computeWeekRecap, computeWeeklyAwards, recentMatchWeeks } from '@/lib/supabase/recap'
import { computeFunFacts } from '@/lib/supabase/stats'
import { formatWeekKey } from '@/lib/utils/dateHelpers'

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
 * Weekly awards — champion, victim, surprise and a random fun fact, for the
 * most recent week that actually had matches (so it shows even on a quiet week).
 */
export function WeeklyAwardsCard() {
  const { players, matches, loading } = useTournamentData()

  const data = useMemo(() => {
    const [wk] = recentMatchWeeks(matches, 1)
    if (!wk) return null
    const recap = computeWeekRecap(matches, players, wk)
    const awards = computeWeeklyAwards(matches, players, wk)
    const facts = computeFunFacts(matches, players)
    const fact = facts.length ? facts[Math.floor(Math.random() * facts.length)] : null
    return { weekKey: wk, champion: recap.champion, loser: recap.loser, surprise: awards.surprise, fact }
  }, [matches, players])

  if (loading || !data) return null
  const { champion, loser, surprise, fact } = data
  if (!champion && !loser && !surprise && !fact) return null

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-lg font-bold">
          <Sparkles className="h-4 w-4 text-primary" /> פרסי השבוע
        </h2>
        <span className="text-xs text-muted-foreground">{formatWeekKey(data.weekKey)}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {champion && (
          <Row emoji="👑" title="אלוף השבוע">
            <TieNames name={champion.name} tie={champion.tie} /> עם {champion.points} נק׳
          </Row>
        )}
        {loser && loser.losses > 0 && (
          <Row emoji="😅" title="קורבן השבוע">
            <TieNames name={loser.name} tie={loser.tie} /> עם {loser.losses} הפסדים
          </Row>
        )}
        {surprise && (
          <Row emoji="😮" title="הפתעת השבוע">
            <span className="font-semibold text-foreground">{surprise.name}</span> — מקום {surprise.actual} (צפוי{' '}
            {surprise.expected}), {surprise.points} נק׳
          </Row>
        )}
        {fact && (
          <Row emoji={fact.emoji} title={`עובדה אקראית · ${fact.title}`}>
            {fact.holder} — {fact.detail}
          </Row>
        )}
      </ul>
    </section>
  )
}
