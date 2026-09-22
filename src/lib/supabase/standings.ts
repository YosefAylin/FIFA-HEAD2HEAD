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

export interface PlayerMatchLine {
  matchId: string
  /** Opponent name(s), joined with " ו" for 2v2. */
  opponents: string
  teamName: string | null
  goalsFor: number
  goalsAgainst: number
  result: 'W' | 'D' | 'L'
}

function isOnSide(match: Match, playerId: string, side: 'home' | 'away'): boolean {
  return side === 'home'
    ? match.home_player_1_id === playerId || match.home_player_2_id === playerId
    : match.away_player_1_id === playerId || match.away_player_2_id === playerId
}

/**
 * The player's actual matches (scorelines) inside one tournament day, oldest
 * first. Backs the expandable rows in the "my table" view.
 */
export function playerMatchesInDay(
  matches: Match[],
  players: Player[],
  playerId: string,
  dayKey: string
): PlayerMatchLine[] {
  const nameOf = new Map(players.map((p) => [p.id, p.name]))
  const sideOf = (m: Match): 'home' | 'away' | null =>
    isOnSide(m, playerId, 'home') ? 'home' : isOnSide(m, playerId, 'away') ? 'away' : null

  return matches
    .filter((m) => matchDayKey(m.created_at) === dayKey)
    .map((m) => ({ m, side: sideOf(m) }))
    .filter((x): x is { m: Match; side: 'home' | 'away' } => x.side !== null)
    .sort((a, b) => a.m.created_at.localeCompare(b.m.created_at))
    .map(({ m, side }) => {
      const home = side === 'home'
      const goalsFor = home ? m.home_score : m.away_score
      const goalsAgainst = home ? m.away_score : m.home_score
      const opponentIds = home
        ? [m.away_player_1_id, m.away_player_2_id]
        : [m.home_player_1_id, m.home_player_2_id]
      const opponents = opponentIds
        .filter((id): id is string => Boolean(id))
        .map((id) => nameOf.get(id) ?? '?')
        .join(' ו')
      return {
        matchId: m.id,
        opponents,
        teamName: home ? m.home_team_name : m.away_team_name,
        goalsFor,
        goalsAgainst,
        result: goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'D' : 'L',
      }
    })
}

export interface PlayerLastTournament {
  dayKey: string
  row: StandingsRow
  /** 1-based placement among everyone who played that day (ties share a rank). */
  rank: number
  /** How many players had a result that day. */
  fieldSize: number
}

/**
 * The player's most recent tournament and how they placed in it. Backs the
 * highlighted summary above the "my table" list. Null when they never played.
 */
export function lastPlayerTournament(
  player: Player,
  players: Player[],
  matches: Match[]
): PlayerLastTournament | null {
  const history = buildPlayerTournamentHistory(player, matches)
  if (history.length === 0) return null
  const latest = history[0]
  const dayRows = buildDayStandings(players, matches, latest.day_key)
  const groups = groupStandingsRows(dayRows)
  const index = groups.findIndex(
    (g) => g.primary.player_id === player.id || g.tied.some((t) => t.player_id === player.id)
  )
  return {
    dayKey: latest.day_key,
    row: latest,
    rank: index + 1,
    fieldSize: dayRows.length,
  }
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
