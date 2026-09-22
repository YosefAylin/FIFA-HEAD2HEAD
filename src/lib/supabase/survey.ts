import { getSupabase } from '@/lib/supabase/client'
import type { WhiskeyResult, WhiskeyVote } from '@/lib/types/database'

const TOKEN_KEY = 'fifa-h2h-voter-token'

// Unique topic per mounted subscription (same limitation as chat.ts/
// useTournamentData: channel(topic) reuses an existing channel on the same
// client, so duplicate topics collide after subscribe()).
let votesInstance = 0

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
  voter_token?: string
  created_at?: string
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
    .limit(1)
  if (error) throw error
  const row = (data ?? [])[0] as unknown as VoteRow | undefined
  if (!row) return null
  return {
    player_id: row.player_id,
    player_name: row.players?.name ?? 'שחקן',
    profile_picture_url: row.players?.profile_picture_url ?? null,
    votes: 0,
  }
}

/**
 * Vote (or change the vote) for a player this week.
 *
 * Deliberately does NOT use `upsert(onConflict: …)`: the live table may lack the
 * (voter_token, week_start_date) unique constraint, which makes Postgres reject
 * the conflict target with 42P10. Instead we read the device's row(s) for the
 * week and update the first / insert a fresh one — also collapsing any duplicate
 * rows left over from the old per-day constraint.
 */
export async function submitVote(playerId: string, weekStartDate: string): Promise<void> {
  const token = getVoterToken()
  const supabase = getSupabase()
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing, error: readError } = await supabase
    .from('whiskey_votes')
    .select('id')
    .eq('voter_token', token)
    .eq('week_start_date', weekStartDate)
  if (readError) throw readError

  const rows = (existing ?? []) as { id: string }[]
  if (rows.length > 0) {
    const [keep, ...dupes] = rows
    const { error } = await supabase
      .from('whiskey_votes')
      .update({ player_id: playerId, vote_date: today })
      .eq('id', keep.id)
    if (error) throw error
    if (dupes.length > 0) {
      const { error: delError } = await supabase
        .from('whiskey_votes')
        .delete()
        .in('id', dupes.map((r) => r.id))
      if (delError) throw delError
    }
    return
  }

  const { error } = await supabase.from('whiskey_votes').insert({
    player_id: playerId,
    voter_token: token,
    week_start_date: weekStartDate,
    vote_date: today,
  })
  if (error) throw error
}

/** Current vote counts per player for a week. */
export async function fetchVoteResults(weekStartDate: string): Promise<WhiskeyResult[]> {
  const { data, error } = await getSupabase()
    .from('whiskey_votes')
    .select('player_id, voter_token, created_at, players(name, profile_picture_url)')
    .eq('week_start_date', weekStartDate)
  if (error) throw error

  // Keep only each device's most recent vote for the week: rows created under
  // the old per-day constraint could otherwise double-count one voter.
  const latestByToken = new Map<string, VoteRow>()
  for (const row of (data ?? []) as unknown as VoteRow[]) {
    const token = row.voter_token ?? row.player_id
    const prev = latestByToken.get(token)
    if (!prev || (row.created_at ?? '') > (prev.created_at ?? '')) latestByToken.set(token, row)
  }

  const counts = new Map<string, WhiskeyResult>()
  for (const row of latestByToken.values()) {
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
    .channel(`whiskey-votes-${++votesInstance}`)
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