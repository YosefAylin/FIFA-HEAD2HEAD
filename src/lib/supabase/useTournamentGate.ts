'use client'

import { useCallback, useEffect, useState } from 'react'
import { hasSupabaseConfig } from '@/lib/supabase/client'
import {
  DEFAULT_TOURNAMENT_MODE,
  fetchTournamentMode,
  isTournamentOpen,
  resolveToggle,
  setTournamentMode,
  subscribeToTournamentMode,
  type TournamentMode,
} from '@/lib/supabase/tournamentGate'

export interface GateState {
  loading: boolean
  mode: TournamentMode
  open: boolean
  isSaturdayToday: boolean
  manual: boolean
  /** True when the next toggle closes the tournament for the weekend (Saturday close). */
  closingForWeekend: boolean
  setMode: (mode: TournamentMode) => Promise<void>
  cycle: () => Promise<void>
}

/**
 * Tournament gate: the tournament is open on Saturdays by default, and can be
 * manually overridden (on/off) from the banner. Shared across the app via one
 * hook instance per page (realtime keeps other devices in sync).
 */
export function useTournamentGate(): GateState {
  const [loading, setLoading] = useState(true)
  const [mode, setModeState] = useState<TournamentMode>(DEFAULT_TOURNAMENT_MODE)
  const [now, setNow] = useState(() => new Date())

  const refresh = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setLoading(false)
      return
    }
    try {
      setModeState(await fetchTournamentMode())
    } catch {
      // table missing → stay on defaults (Saturday-only)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    if (!hasSupabaseConfig()) return
    const unsub = subscribeToTournamentMode((m) => setModeState(m))
    return unsub
  }, [refresh])

  const isSaturdayToday = isTournamentOpen('auto', now)
  const open = isTournamentOpen(mode, now)
  // The manual override is only meaningful when it actually *changes* the day
  // (i.e. open on a non-Saturday, or closed on a Saturday).
  const manual = mode !== DEFAULT_TOURNAMENT_MODE

  const setMode = useCallback(async (next: TournamentMode) => {
    setModeState(next)
    try {
      await setTournamentMode(next)
    } catch {
      // settings table may not exist yet — reflect the change in-memory anyway
    }
  }, [])

  const cycle = useCallback(async () => {
    await setMode(resolveToggle(mode, now))
  }, [mode, now, setMode])

  const closingForWeekend = resolveToggle(mode, now) === 'off'

  return { loading, mode, open, isSaturdayToday, manual, closingForWeekend, setMode, cycle }
}