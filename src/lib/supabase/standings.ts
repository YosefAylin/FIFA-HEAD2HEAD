import { computePlayerStats } from '@/lib/supabase/stats'
import { matchDayKey } from '@/lib/utils/dateHelpers'
import { regularsOnly } from '@/lib/utils/playerHelpers'
import type { Match, Player, StandingsRow } from '@/lib/types/database'

/**
 * Group standings rows whose football tie key — points, losses, win% and goal
 * difference — is identical. Each group is `[primary, ...rest]` (primary = the
 * row the medal/rank applies to); the `rest` names render stacked as ties.
 * Rows are already order-sorted, so a single pass suffices.
 */
export interface StandingsGroup {
  /** The row that carries the rank (first in sort order). */
  primary: StandingsRow
  /** Other rows with the identical tie key. */
  tied: StandingsRow[]
}

export function groupStandingsRows(rows: StandingsRow[]): StandingsGroup[] {
  const groups: StandingsGroup[] = []
  for (const row of rows) {
    const prev = groups[groups.length - 1]
    if (
      prev &&
      prev.primary.points === row.points &&
      prev.primary.losses === row.losses &&
      prev.primary.win_percentage === row.win_percentage &&
      prev.primary.goal_difference === row.goal_difference
    ) {
      prev.tied.push(row)
    } else {
      groups.push({ primary: row, tied: [] })
    }
  }
  return groups
}

/**
 * Football-table order: most points first; on equal points, fewer losses ranks
 * higher; then higher win%; then goal diff. Matches the old SQL view ordering.
 */
function sortStandings(rows: StandingsRow[]): StandingsRow[] {
  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      a.losses - b.losses ||
      b.win_percentage - a.win_percentage ||
      b.goal_difference - a.goal_difference
  )
}

function toRow(player: Player, matches: Match[], dayKey: string): StandingsRow {
  const s = computePlayerStats(matches, player.id)
  return {
    player_id: player.id,
    player_name: player.name,
    profile_picture_url: player.profile_picture_url,
    day_key: dayKey,
    matches_played: s.matches,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    goals_for: s.goalsFor,
    goals_against: s.goalsAgainst,
    goal_difference: s.goalDifference,
    points: s.points,
    win_percentage: s.winPercentage,
    is_guest: player.is_guest === true,
  }
}

/**
 * All-time standings, computed client-side from the live match feed so the
 * board updates in realtime without a round-trip to a Postgres view. Guests are
 * excluded (they only count for the day), and players with no matches are
 * omitted (they'd only render as empty rows).
 */
export function buildAllTimeStandings(players: Player[], matches: Match[]): StandingsRow[] {
  return sortStandings(
    regularsOnly(players)
      .map((p) => toRow(p, matches, ''))
      .filter((r) => r.matches_played > 0)
  )
}

/** Standings for a single tournament day (02:00 -> 02:00 boundary). Guests count. */
export function buildDayStandings(
  players: Player[],
  matches: Match[],
  dayKey: string
): StandingsRow[] {
  const dayMatches = matches.filter((m) => matchDayKey(m.created_at) === dayKey)
  return sortStandings(
    players
      .map((p) => toRow(p, dayMatches, dayKey))
      .filter((r) => r.matches_played > 0)
  )
}

/**
 * One row per tournament day a player actually played in, newest first. Backs
 * the "my table" view: pick a player and see every tournament they took part in
 * and how they did in each. Days they sat out simply don't appear.
 */
export function buildPlayerTournamentHistory(player: Player, matches: Match[]): StandingsRow[] {
  const byDay = new Map<string, Match[]>()
  for (const m of matches) {
    const key = matchDayKey(m.created_at)
    const list = byDay.get(key)
    if (list) list.push(m)
    else byDay.set(key, [m])
  }
  return [...byDay.entries()]
    .map(([dayKey, dayMatches]) => toRow(player, dayMatches, dayKey))
    .filter((r) => r.matches_played > 0)
    .sort((a, b) => b.day_key.localeCompare(a.day_key))
}
