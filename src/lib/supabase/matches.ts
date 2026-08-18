import { getSupabase } from '@/lib/supabase/client'
import type { GameMode, Match, MatchWithPlayers, Player } from '@/lib/types/database'

export interface MatchInput {
  game_mode: GameMode
  home_player_1_id: string
  home_player_2_id: string | null
  away_player_1_id: string
  away_player_2_id: string | null
  home_score: number
  away_score: number
  home_team_name?: string | null
  away_team_name?: string | null
  week_start_date: string
}

export async function fetchMatches(): Promise<Match[]> {
  const { data, error } = await getSupabase()
    .from('matches')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Match[]
}

/** Matches including soft-deleted ones (for restore UI). */
export async function fetchAllMatches(): Promise<Match[]> {
  const { data, error } = await getSupabase()
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Match[]
}

/** Join matches with player rows so names/avatars render without N+1 queries. */
export function joinMatchesWithPlayers(matches: Match[], players: Player[]): MatchWithPlayers[] {
  const byId = new Map(players.map((p) => [p.id, p]))
  return matches.map((m) => ({
    ...m,
    home_player_1_name: byId.get(m.home_player_1_id)?.name ?? '?',
    home_player_2_name: m.home_player_2_id ? byId.get(m.home_player_2_id)?.name ?? null : null,
    away_player_1_name: byId.get(m.away_player_1_id)?.name ?? '?',
    away_player_2_name: m.away_player_2_id ? byId.get(m.away_player_2_id)?.name ?? null : null,
    home_avatar_url: byId.get(m.home_player_1_id)?.profile_picture_url ?? null,
    away_avatar_url: byId.get(m.away_player_1_id)?.profile_picture_url ?? null,
  }))
}

export async function addMatch(input: MatchInput): Promise<Match> {
  const { data, error } = await getSupabase().from('matches').insert(input).select().single()
  if (error) throw error
  return data as Match
}

export async function updateMatch(id: string, patch: Partial<MatchInput>): Promise<void> {
  const { error } = await getSupabase().from('matches').update(patch).eq('id', id)
  if (error) throw error
}

export async function softDeleteMatch(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('matches')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function restoreMatch(id: string): Promise<void> {
  const { error } = await getSupabase().from('matches').update({ deleted_at: null }).eq('id', id)
  if (error) throw error
}

/** Distinct week keys present in non-deleted matches, newest first. */
export async function fetchWeekKeys(): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('matches')
    .select('week_start_date')
    .is('deleted_at', null)
    .order('week_start_date', { ascending: false })
  if (error) throw error
  const keys = [...new Set((data ?? []).map((r) => r.week_start_date as string))]
  return keys
}
