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
  /** True while the "build a match" selection mode is active. */
  selecting: boolean
  /** Ordered ids selected for the upcoming match (max 4). */
  selectedIds: string[]
  /** Card tapped outside selection mode → open the player action sheet. */
  onCardClick: (player: Player) => void
  /** Card tapped during selection mode → toggle it in/out of the match. */
  onToggleSelect: (player: Player) => void
}

/** Home grid: large player cards with weekly rank medals + humor badges. */
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
    return <p className="panel p-4 text-loss">{error}</p>
  }

  return (
    <div>
      {effectivePlayers.length === 0 ? (
        <div className="panel flex items-center justify-center py-10 text-center text-ink-mid">
          אין שחקנים עדיין — הוסיפו את הראשון
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ranked.map((player, i) => {
            const order = selectedIds.indexOf(player.id)
            const selected = order >= 0
            return (
              <PlayerCard
                key={player.id}
                player={player}
                badge={badges.get(player.id) ?? null}
                rank={i + 1}
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
