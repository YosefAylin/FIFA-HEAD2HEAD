import { getSupabase } from '@/lib/supabase/client'
import type { Player } from '@/lib/types/database'

/** All players, newest first. */
export async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await getSupabase()
    .from('players')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Player[]
}

export async function addPlayer(name: string, isGuest = false): Promise<Player> {
  // Only send is_guest when true, so adding a regular keeps working even before
  // the player-guest.sql migration is applied.
  const row: { name: string; is_guest?: boolean } = { name: name.trim() }
  if (isGuest) row.is_guest = true
  const { data, error } = await getSupabase()
    .from('players')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data as Player
}

/**
 * Permanently delete a player and every match they appear in.
 * The matches table has plain FK refs (no cascade), so their matches
 * must be removed first — this wipes the shared history too.
 */
export async function deletePlayerCompletely(id: string): Promise<void> {
  const sb = getSupabase()
  const { error: matchError } = await sb
    .from('matches')
    .delete()
    .or(
      `home_player_1_id.eq.${id},home_player_2_id.eq.${id},away_player_1_id.eq.${id},away_player_2_id.eq.${id}`
    )
  if (matchError) throw matchError
  const { error: playerError } = await sb.from('players').delete().eq('id', id)
  if (playerError) throw playerError
}

/** Rename a player (updates the shared `players.name`). */
export async function updatePlayerName(id: string, name: string): Promise<void> {
  const { error } = await getSupabase().from('players').update({ name: name.trim() }).eq('id', id)
  if (error) throw error
}

export async function updatePlayerActive(id: string, isActive: boolean): Promise<void> {  const { error } = await getSupabase()
    .from('players')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

/** Mark a player as a guest (or a regular). Guests skip all-time stats. */
export async function updatePlayerGuest(id: string, isGuest: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('players')
    .update({ is_guest: isGuest })
    .eq('id', id)
  if (error) throw error
}

export async function updatePlayerProfilePicture(id: string, url: string): Promise<void> {
  const { error } = await getSupabase()
    .from('players')
    .update({ profile_picture_url: url })
    .eq('id', id)
  if (error) throw error
}

/** Upload an avatar image and return its public URL. */
export async function uploadAvatar(file: File, playerId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${playerId}/avatar-${Date.now()}.${ext}`
  const { error } = await getSupabase().storage.from('avatars').upload(path, file, {
    upsert: true,
  })
  if (error) throw error
  const { data } = getSupabase().storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}
