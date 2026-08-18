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

/** True if this device already voted today. */
export async function hasVotedToday(): Promise<boolean> {
  const token = getVoterToken()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await getSupabase()
    .from('whiskey_votes')
    .select('id')
    .eq('voter_token', token)
    .eq('vote_date', today)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

interface VoteRow {
  player_id: string
  players: { name: string; profile_picture_url: string | null } | null
}

export async function submitVote(playerId: string, weekStartDate: string): Promise<void> {
  const token = getVoterToken()
  const { error } = await getSupabase().from('whiskey_votes').insert({
    player_id: playerId,
    voter_token: token,
    week_start_date: weekStartDate,
  })
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