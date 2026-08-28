import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import { getJerusalemDayKey, getJerusalemTimeOfDay, isSaturday } from '@/lib/utils/dateHelpers'

export type TournamentMode = 'auto' | 'on' | 'off'

const SETTINGS_KEY = 'tournament'
export const DEFAULT_TOURNAMENT_MODE: TournamentMode = 'auto'

/** The session's informal end — the group usually finishes ~21:00 Israel time. */
export const TOURNAMENT_END_HOUR = 21

/** The session's typical start — Saturday afternoons ~16:00 Israel time. */
export const TOURNAMENT_START_HOUR = 16

/** Typical Saturday session length (start → informal end), in hours. */
export const TOURNAMENT_SESSION_HOURS = TOURNAMENT_END_HOUR - TOURNAMENT_START_HOUR // 5

/**
 * Fraction (0..1) of the Saturday session still remaining: 1 before the start
 * (or early on), shrinking linearly to 0 at the ~21:00 cut. Used by the odds
 * engine to lean the forecast on history + power rank as the countdown runs out.
 */
export function sessionRemaining(now: Date): number {
  const remaining = Math.max(0, TOURNAMENT_END_HOUR - getJerusalemTimeOfDay(now))
  return Math.min(1, remaining / TOURNAMENT_SESSION_HOURS)
}

// Unique topic per mounted subscription (see chat.ts for the why).
let settingsInstance = 0

interface StoredValue {
  mode?: TournamentMode
  /** ISO timestamp when a manual override was set. `auto` has none. */
  at?: string
}

/**
 * A manual override only lasts for the rest of the current Jerusalem calendar
 * day — the next time the day key rolls over it's treated as expired and the
 * gate falls back to `auto`. Missing/invalid timestamps (e.g. legacy rows
 * written before overrides were stamped) are treated as already expired.
 */
function isOverrideExpired(mode: TournamentMode, at: string | undefined, now: Date): boolean {
  if (mode === 'auto') return false
  if (!at) return true
  const atDate = new Date(at)
  if (Number.isNaN(atDate.getTime())) return true
  return getJerusalemDayKey(atDate) !== getJerusalemDayKey(now)
}

export async function fetchTournamentMode(): Promise<TournamentMode> {
  const { data, error } = await getSupabase()
    .from('settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()
  if (error) throw error
  const stored = data?.value as StoredValue | undefined
  const mode = stored?.mode ?? DEFAULT_TOURNAMENT_MODE
  if (mode === 'auto') return mode

  const now = new Date()
  if (isOverrideExpired(mode, stored?.at, now)) {
    // Self-heal: write `auto` back so the stored state (and every other
    // device that reads it) agrees the override is gone.
    await setTournamentMode('auto')
    return DEFAULT_TOURNAMENT_MODE
  }
  return mode
}

export async function setTournamentMode(mode: TournamentMode): Promise<void> {
  await getSupabase()
    .from('settings')
    .upsert({
      key: SETTINGS_KEY,
      value: mode === 'auto' ? { mode } : { mode, at: new Date().toISOString() },
    })
  // error propagates naturally as a rejected promise
}

/** The tournament is "open" when it's Saturday, or when a manual override says so. */
export function isTournamentOpen(mode: TournamentMode, now: Date): boolean {
  if (mode === 'on') return true
  if (mode === 'off') return false
  return isSaturday(now)
}

/**
 * Where a toggle from the current mode lands, given the day.
 * - Weekday open (`auto` → `on`): manual open, shown as such.
 * - Weekday close (`on` → `auto`): revert to auto — a mid-week close is just
 *   "not open", it must not survive into (or out of) the weekend.
 * - Saturday open (`off` → `auto`): back to the natural open state.
 * - Saturday close (`auto` → `off`): the one case that needs confirmation —
 *   closes for the rest of the day and stays closed through the weekend end.
 */
export function resolveToggle(mode: TournamentMode, now: Date): TournamentMode {
  const saturday = isSaturday(now)
  if (mode === 'auto') return saturday ? 'off' : 'on'
  if (mode === 'on') return saturday ? 'off' : 'auto'
  return saturday ? 'auto' : 'on' // 'off' on a weekday shouldn't happen, but reopen to manual
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