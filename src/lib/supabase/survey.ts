import { getSupabase } from '@/lib/supabase/client'
import type { WhiskeyResult, WhiskeyVote } from '@/lib/types/database'

const TOKEN_KEY = 'fifa-h2h-voter-token'

/** Stable anonymous per-device voter token. */
export function getVoterToken(): string {
  if (typeof window === 'undefined') return 'server'
  let token = window.localStorage.getItem(TOKEN_KEY)
  if (!token) {
    token =
      'dev-' +
      Math.random().toString(36).slice(2) +
      '-' +
      Math.random().toString(36).slice(2)
    window.localStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

interface VoteRow {
  player_id: string
  players: { name: string; profile_picture_url: string | null } | null
}

/** This device's vote (if any) for the given week, with the player row joined in. */
export async function getMyVote(weekStartDate: string): Promise<WhiskeyResult | null> {
  const token = getVoterToken()
  const { data, error } = await getSupabase()
    .from('whiskey_votes')
    .select('player_id, players(name, profile_picture_url)')
    .eq('voter_token', token)
    .eq('week_start_date', weekStartDate)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as VoteRow
  return {
    player_id: row.player_id,
    player_name: row.players?.name ?? 'שחקן',
    profile_picture_url: row.players?.profile_picture_url ?? null,
    votes: 0,
  }
}

/**
 * Vote (or re-vote) for a player this week. Upserts on
 * (voter_token, week_start_date), so changing your vote replaces it.
 */
export async function submitVote(playerId: string, weekStartDate: string): Promise<void> {
  const token = getVoterToken()
  const { error } = await getSupabase()
    .from('whiskey_votes')
    .upsert(
      {
        player_id: playerId,
        voter_token: token,
        week_start_date: weekStartDate,
        vote_date: new Date().toISOString().slice(0, 10),
      },
      { onConflict: 'voter_token,week_start_date' }
    )
  if (error) throw error
}

/** Current vote counts per player for a week. */
export async function fetchVoteResults(weekStartDate: string): Promise<WhiskeyResult[]> {
  const { data, error } = await getSupabase()
    .from('whiskey_votes')
    .select('player_id, players(name, profile_picture_url)')
    .eq('week_start_date', weekStartDate)
  if (error) throw error

  const counts = new Map<string, WhiskeyResult>()
  for (const row of (data ?? []) as unknown as VoteRow[]) {
    const name = row.players?.name ?? 'שחקן'
    const avatar = row.players?.profile_picture_url ?? null
    const existing = counts.get(row.player_id) ?? {
      player_id: row.player_id,
      player_name: name,
      profile_picture_url: avatar,
      votes: 0,
    }
    existing.votes += 1
    counts.set(row.player_id, existing)
  }
  return [...counts.values()].sort((a, b) => b.votes - a.votes)
}

export type VoteEventCallback = (payload: {
  eventType: string
  new?: Partial<WhiskeyVote>
  old?: Partial<WhiskeyVote>
}) => void

/** Subscribe to realtime changes on whiskey_votes. Returns an unsubscribe fn. */
export function subscribeToVotes(callback: VoteEventCallback): () => void {
  const channel = getSupabase()
    .channel('whiskey-votes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'whiskey_votes' },
      (payload) => callback(payload as Parameters<VoteEventCallback>[0])
    )
    .subscribe()
  return () => {
    void getSupabase().removeChannel(channel)
  }
}