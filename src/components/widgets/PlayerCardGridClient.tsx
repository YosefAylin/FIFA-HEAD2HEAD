'use client'

import { useMemo } from 'react'
import { PlayerCard } from '@/components/cards/PlayerCard'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { assignBadges, computePlayerStats } from '@/lib/supabase/stats'
import { distinctDayKeys, formatDayKey, matchDayKey } from '@/lib/utils/dateHelpers'
import { activeFirst } from '@/lib/utils/sortHelpers'
import type { Match, Player } from '@/lib/types/database'

interface Props {
  initialPlayers: Player[]
  initialMatches: Match[]
  /** True while the "build a match" selection mode is active. */
  selecting: boolean
  /** Ordered ids selected for the upcoming match (max 4). */
  selectedIds: string[]
  /** Card tapped outside selection mode → open the player action sheet. */
  onCardClick: (player: Player) => void
  /** Card tapped during selection mode → toggle it in/out of the match. */
  onToggleSelect: (player: Player) => void
}

/**
 * Home grid: large player cards with rank medals + humor badges.
 *
 * Ranks/medals are for the most recent tournament day (02:00 -> 02:00), not the
 * whole week — so the person who actually won the last session wears 🥇 even on
 * a day off. When no match has ever been logged, nobody gets a medal.
 */
export function PlayerCardGridClient({
  initialPlayers,
  initialMatches,
  selecting,
  selectedIds,
  onCardClick,
  onToggleSelect,
}: Props) {
  const { players, matches, loading, error, reload } = useTournamentData()

  // Use server-provided initial data until the hook has loaded its own.
  const effectivePlayers = loading ? initialPlayers : players
  const effectiveMatches = loading ? initialMatches : matches

  const latestDay = useMemo(() => distinctDayKeys(effectiveMatches)[0] ?? null, [effectiveMatches])

  const dayMatches = useMemo(
    () => (latestDay ? effectiveMatches.filter((m) => matchDayKey(m.created_at) === latestDay) : []),
    [effectiveMatches, latestDay]
  )

  const stats = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computePlayerStats>>()
    for (const p of effectivePlayers) map.set(p.id, computePlayerStats(dayMatches, p.id))
    return map
  }, [effectivePlayers, dayMatches])

  const badges = useMemo(
    () => assignBadges(effectivePlayers, stats),
    [effectivePlayers, stats]
  )

  const ranked = useMemo(
    () =>
      [...effectivePlayers].sort((a, b) => {
        const sa = stats.get(a.id)
        const sb = stats.get(b.id)
        return (
          activeFirst(a, b) ||
          (sb?.points ?? 0) - (sa?.points ?? 0) ||
          (sa?.losses ?? 0) - (sb?.losses ?? 0) ||
          (sb?.winPercentage ?? 0) - (sa?.winPercentage ?? 0) ||
          (sb?.goalDifference ?? 0) - (sa?.goalDifference ?? 0)
        )
      }),
    [effectivePlayers, stats]
  )

  // Rank only players who actually played the latest day — a bye week shouldn't
  // hand a medal to someone who never touched the ball.
  const rankById = useMemo(() => {
    const map = new Map<string, number>()
    let rank = 0
    for (const p of ranked) {
      if ((stats.get(p.id)?.matches ?? 0) > 0) map.set(p.id, ++rank)
    }
    return map
  }, [ranked, stats])

  if (error && effectivePlayers.length === 0) {
    return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{latestDay ? formatDayKey(latestDay) : 'אין משחקים עדיין'}</span>
        <button onClick={() => void reload()} className="text-primary hover:underline">
          רענן
        </button>
      </div>
      {effectivePlayers.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface py-10 text-center text-muted-foreground">
          אין שחקנים עדיין — הוסיפו את הראשון! 👇
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ranked.map((player) => {
            const order = selectedIds.indexOf(player.id)
            const selected = order >= 0
            return (
              <PlayerCard
                key={player.id}
                player={player}
                badge={badges.get(player.id) ?? null}
                rank={rankById.get(player.id) ?? 0}
                selectOrder={selected ? order + 1 : undefined}
                selecting={selecting}
                onClick={() => {
                  if (selecting) onToggleSelect(player)
                  else onCardClick(player)
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
