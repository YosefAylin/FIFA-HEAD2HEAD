'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase, hasSupabaseConfig } from '@/lib/supabase/client'
import { fetchPlayers } from '@/lib/supabase/players'
import { fetchMatches } from '@/lib/supabase/matches'
import type { Match, Player } from '@/lib/types/database'

// Monotonic counter so every mounted hook instance gets its own channel
// topic. Supabase's channel(topic) returns an EXISTING channel when the topic
// repeats on the same client, so two components subscribing with the same
// name (e.g. home page + the grid it renders) collide: the second one sees
// an already-subscribed channel and its .on() throws
// "cannot add 'postgres_changes' callbacks after 'subscribe()'".
let channelInstance = 0

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

    // Unique topic per mounted instance (`realtime-1-players`, `realtime-2-players`, …)
    // so multiple simultaneously-mounted consumers each get their own channel
    // instead of reusing an already-subscribed one.
    const supabase = getSupabase()
    const instance = ++channelInstance
    const tables = ['players', 'matches']
    const channels: RealtimeChannel[] = []

    for (const table of tables) {
      const channel = supabase
        .channel(`realtime-${instance}-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          // Debounce reloads so bursts of events don't hammer the API.
          setTimeout(() => void reload(), 150)
        })
      channels.push(channel)
    }

    for (const channel of channels) channel.subscribe()

    return () => {
      for (const channel of channels) void supabase.removeChannel(channel)
    }
  }, [reload])

  return { players, matches, loading, error, reload }
}
