import { getSupabase } from '@/lib/supabase/client'
import type { StandingsRow } from '@/lib/types/database'

/** Standings for a specific week from the weekly_standings view. */
export async function fetchStandings(weekKey: string): Promise<StandingsRow[]> {
  const { data, error } = await getSupabase()
    .from('weekly_standings')
    .select('*')
    .eq('week_start_date', weekKey)
    .order('points', { ascending: false })
    .order('goal_difference', { ascending: false })
    .order('goals_for', { ascending: false })
  if (error) throw error
  return (data ?? []) as StandingsRow[]
}

/** All-time standings from the all_time_standings view. */
export async function fetchAllTimeStandings(): Promise<StandingsRow[]> {
  const { data, error } = await getSupabase()
    .from('all_time_standings')
    .select('*')
    .order('points', { ascending: false })
    .order('goal_difference', { ascending: false })
    .order('goals_for', { ascending: false })
  if (error) throw error
  return (data ?? []) as StandingsRow[]
}

/** The top player for a given week (for rank medals on the home page). */
export async function fetchWeekChampion(weekKey: string): Promise<StandingsRow | null> {
  const rows = await fetchStandings(weekKey)
  return rows[0] ?? null
}
