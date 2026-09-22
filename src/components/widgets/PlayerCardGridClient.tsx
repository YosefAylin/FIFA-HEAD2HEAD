'use client'

import { useMemo } from 'react'
import { PlayerCard } from '@/components/cards/PlayerCard'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { assignBadges, computePlayerStats } from '@/lib/supabase/stats'
import { activeFirst } from '@/lib/utils/sortHelpers'
import { groupPlayersByStatus, regularsOnly } from '@/lib/utils/playerHelpers'
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
 * Tournament grid: large player cards ranked by the ALL-TIME standings — the
 * top 3 overall wear the medals, and the humor badges match the all-time board.
 * Guests never carry an all-time rank, so they sink to the bottom without a
 * medal. Tap a card to open the action sheet, or to build a match while
 * selecting.
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

  const stats = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computePlayerStats>>()
    for (const p of effectivePlayers) map.set(p.id, computePlayerStats(effectiveMatches, p.id))
    return map
  }, [effectivePlayers, effectiveMatches])

  const badges = useMemo(
    () => assignBadges(regularsOnly(effectivePlayers), stats),
    [effectivePlayers, stats]
  )

  // All-time football order: active first, guests last, then points → fewer
  // losses → win% → goal diff (identical to the all-time board).
  const ranked = useMemo(
    () =>
      [...effectivePlayers].sort((a, b) => {
        const sa = stats.get(a.id)
        const sb = stats.get(b.id)
        return (
          activeFirst(a, b) ||
          (a.is_guest === true ? 1 : 0) - (b.is_guest === true ? 1 : 0) ||
          (sb?.points ?? 0) - (sa?.points ?? 0) ||
          (sa?.losses ?? 0) - (sb?.losses ?? 0) ||
          (sb?.winPercentage ?? 0) - (sa?.winPercentage ?? 0) ||
          (sb?.goalDifference ?? 0) - (sa?.goalDifference ?? 0)
        )
      }),
    [effectivePlayers, stats]
  )

  // Medals go to the top-3 REGULARS by all-time standing; anyone with no
  // all-time matches stays unranked.
  const rankById = useMemo(() => {
    const map = new Map<string, number>()
    let rank = 0
    for (const p of ranked) {
      if (p.is_guest === true) continue
      if ((stats.get(p.id)?.matches ?? 0) > 0) map.set(p.id, ++rank)
    }
    return map
  }, [ranked, stats])

  // Split into active / inactive / guest sections (order preserved from `ranked`).
  const sections = useMemo(() => {
    const groups = groupPlayersByStatus(ranked)
    return [
      { key: 'active', label: 'שחקנים פעילים', players: groups.active },
      { key: 'inactive', label: 'לא פעילים', players: groups.inactive },
      { key: 'guests', label: 'אורחים', players: groups.guests },
    ].filter((s) => s.players.length > 0)
  }, [ranked])

  if (error && effectivePlayers.length === 0) {
    return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">{error}</p>
  }

  function renderCards(list: Player[]) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((player) => {
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
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>דירוג כל הזמנים</span>
        <button onClick={() => void reload()} className="text-primary hover:underline">
          רענן
        </button>
      </div>
      {effectivePlayers.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface py-10 text-center text-muted-foreground">
          אין שחקנים עדיין — הוסיפו את הראשון! 👇
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 px-1 text-sm font-bold text-muted-foreground">
              {section.label}
              <span className="text-xs font-normal">({section.players.length})</span>
            </h3>
            {renderCards(section.players)}
          </section>
        ))
      )}
    </div>
  )
}
