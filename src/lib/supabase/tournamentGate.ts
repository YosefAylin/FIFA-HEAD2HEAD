import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import { isSaturday } from '@/lib/utils/dateHelpers'

export type TournamentMode = 'auto' | 'on' | 'off'

const SETTINGS_KEY = 'tournament'
export const DEFAULT_TOURNAMENT_MODE: TournamentMode = 'auto'

// Unique topic per mounted subscription (see chat.ts for the why).
let settingsInstance = 0

export async function fetchTournamentMode(): Promise<TournamentMode> {
  const { data, error } = await getSupabase()
    .from('settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()
  if (error) throw error
  const mode = (data?.value as { mode?: TournamentMode } | undefined)?.mode
  return mode === 'on' || mode === 'off' ? mode : DEFAULT_TOURNAMENT_MODE
}

export async function setTournamentMode(mode: TournamentMode): Promise<void> {
  const { error } = await getSupabase()
    .from('settings')
    .upsert({ key: SETTINGS_KEY, value: { mode } })
  if (error) throw error
}

/** The tournament is "open" when it's Saturday, or when a manual override says so. */
export function isTournamentOpen(mode: TournamentMode, now: Date): boolean {
  if (mode === 'on') return true
  if (mode === 'off') return false
  return isSaturday(now)
}

/** Subscribe to setting changes. Returns an unsubscribe fn. */
export function subscribeToTournamentMode(callback: (mode: TournamentMode) => void): () => void {
  const channel: RealtimeChannel = getSupabase()
    .channel(`settings-${++settingsInstance}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settings' },
      () => void fetchTournamentMode().then(callback).catch(() => {})
    )
    .subscribe()
  return () => {
    void getSupabase().removeChannel(channel)
  }
}