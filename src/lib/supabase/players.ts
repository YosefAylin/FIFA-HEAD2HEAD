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

export async function addPlayer(name: string): Promise<Player> {
  const { data, error } = await getSupabase()
    .from('players')
    .insert({ name: name.trim() })
    .select()
    .single()
  if (error) throw error
  return data as Player
}

export async function updatePlayerActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('players')
    .update({ is_active: isActive })
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
