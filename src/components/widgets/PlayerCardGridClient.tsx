'use client'

import { useMemo } from 'react'
import { PlayerCard } from '@/components/cards/PlayerCard'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { assignBadges, computePlayerStats } from '@/lib/supabase/stats'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import { activeFirst } from '@/lib/utils/sortHelpers'
import type { Match, Player } from '@/lib/types/database'

interface Props {
  initialPlayers: Player[]
  initialMatches: Match[]
}

/** Home grid: large player cards with weekly rank medals + humor badges. */
export function PlayerCardGridClient({ initialPlayers, initialMatches }: Props) {
  const { players, matches, loading, error, reload } = useTournamentData()

  // Use server-provided initial data until the hook has loaded its own.
  const effectivePlayers = loading ? initialPlayers : players
  const effectiveMatches = loading ? initialMatches : matches
  const weekKey = getCurrentWeekKey()

  const weekMatches = useMemo(
    () => effectiveMatches.filter((m) => m.week_start_date === weekKey),
    [effectiveMatches, weekKey]
  )

  const stats = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computePlayerStats>>()
    for (const p of effectivePlayers) map.set(p.id, computePlayerStats(weekMatches, p.id))
    return map
  }, [effectivePlayers, weekMatches])

  const badges = useMemo(
    () => assignBadges(effectivePlayers, stats),
    [effectivePlayers, stats]
  )

  const ranked = useMemo(
    () =>
      [...effectivePlayers].sort((a, b) => {
        const sa = stats.get(a.id)
        const sb = stats.get(b.id)
        return activeFirst(a, b) || (sb?.points ?? 0) - (sa?.points ?? 0)
      }),
    [effectivePlayers, stats]
  )

  if (error && effectivePlayers.length === 0) {
    return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>השבוע</span>
        <button onClick={() => void reload()} className="text-primary hover:underline">
          רענן
        </button>
      </div>
      {effectivePlayers.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface py-10 text-center text-muted-foreground">
          אין שחקנים עדיין — הוסיפו את הראשון! 👇
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ranked.map((player, i) => (
            <PlayerCard
              key={player.id}
              player={player}
              stats={stats.get(player.id) ?? null}
              badge={badges.get(player.id) ?? null}
              rank={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
