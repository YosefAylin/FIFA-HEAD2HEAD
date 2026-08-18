'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase, hasSupabaseConfig } from '@/lib/supabase/client'
import { fetchPlayers } from '@/lib/supabase/players'
import { fetchMatches } from '@/lib/supabase/matches'
import type { Match, Player } from '@/lib/types/database'

/**
 * Central realtime store: players + non-deleted matches, refreshed on any
 * postgres change to either table. Used by the home grid and match history.
 */
export function useTournamentData() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reloading = useRef(false)

  const reload = useCallback(async () => {
    if (reloading.current) return
    reloading.current = true
    try {
      const [ps, ms] = await Promise.all([fetchPlayers(), fetchMatches()])
      setPlayers(ps)
      setMatches(ms)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת נתונים')
    } finally {
      reloading.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setLoading(false)
      setError('חסרה הגדרת Supabase (NEXT_PUBLIC_SUPABASE_URL)')
      return
    }
    void reload()

    const channels = ['players', 'matches'].map((table) =>
      getSupabase()
        .channel(`realtime-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            // Debounce reloads so bursts of events don't hammer the API.
            setTimeout(() => void reload(), 150)
          }
        )
        .subscribe()
    )
    return () => {
      for (const ch of channels) void getSupabase().removeChannel(ch)
    }
  }, [reload])

  return { players, matches, loading, error, reload }
}
