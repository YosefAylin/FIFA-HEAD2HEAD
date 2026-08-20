import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import { getJerusalemHour, isSaturday } from '@/lib/utils/dateHelpers'

export type TournamentMode = 'auto' | 'on' | 'off'

const SETTINGS_KEY = 'tournament'
export const DEFAULT_TOURNAMENT_MODE: TournamentMode = 'auto'

/** The session's informal end — the group usually finishes ~21:00 Israel time. */
export const TOURNAMENT_END_HOUR = 21

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

/**
 * Whether the session has informally wound down: Saturday after the usual
 * ~21:00 Israel cut (or any day with a manual override). Deliberately separate
 * from `isTournamentOpen` — the gate still lets people record matches, but the
 * odds lean final and the bot fires its closing note once this flips.
 */
export function tournamentEnded(mode: TournamentMode, now: Date): boolean {
  if (mode === 'off') return true
  if (mode === 'on') return false
  return isSaturday(now) && getJerusalemHour(now) >= TOURNAMENT_END_HOUR
}

/** Subscribe to setting changes. Returns an unsubscribe fn. */
export function subscribeToTournamentMode(callback: (mode: TournamentMode) => void): () => void {
  const channel: RealtimeChannel = getSupabase()
    .channel(`settings-gate-${++settingsInstance}`)
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