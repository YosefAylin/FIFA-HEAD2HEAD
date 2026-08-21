import { getSupabase } from '@/lib/supabase/client'
import type { StandingsRow } from '@/lib/types/database'

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

/** Standings for a specific week from the weekly_standings view. */
export async function fetchStandings(weekKey: string): Promise<StandingsRow[]> {
  const { data, error } = await getSupabase()
    .from('weekly_standings')
    .select('*')
    .eq('week_start_date', weekKey)
    // Football-table order: most points first; on equal points, fewer losses
    // ranks higher; then higher win%; then goal diff.
    .order('points', { ascending: false })
    .order('losses', { ascending: true })
    .order('win_percentage', { ascending: false })
    .order('goal_difference', { ascending: false })
  if (error) throw error
  return (data ?? []) as StandingsRow[]
}

/** All-time standings from the all_time_standings view. */
export async function fetchAllTimeStandings(): Promise<StandingsRow[]> {
  const { data, error } = await getSupabase()
    .from('all_time_standings')
    .select('*')
    .order('points', { ascending: false })
    .order('losses', { ascending: true })
    .order('win_percentage', { ascending: false })
    .order('goal_difference', { ascending: false })
  if (error) throw error
  return (data ?? []) as StandingsRow[]
}

/** The top player for a given week (for rank medals on the home page). */
export async function fetchWeekChampion(weekKey: string): Promise<StandingsRow | null> {
  const rows = await fetchStandings(weekKey)
  return rows[0] ?? null
}