'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig } from '@/lib/supabase/client'
import { latestTournamentLoser, type LatestTournamentLoser } from '@/lib/supabase/standings'
import {
  fetchManualExemptions,
  setManualExemption,
  subscribeToManualExemptions,
} from '@/lib/supabase/whiskyExemptions'
import type { Match, Player } from '@/lib/types/database'

export interface WhiskyExemptionState {
  loading: boolean
  /** Latest tournament day's last-place regular — always exempt. */
  autoLoser: LatestTournamentLoser | null
  /** Players a human marked exempt this week. */
  manualIds: string[]
  /** Automatic + manual, ready for filtering the odds/vote. */
  exemptIds: Set<string>
  /** True when the exemption is automatic (the latest loser). */
  isAuto: (playerId: string) => boolean
  toggle: (playerId: string, exempt: boolean) => Promise<void>
}

/**
 * The whisky-exemption store shared by the odds card and the survey: the most
 * recent tournament's last-place regular is always exempt, plus any manual
 * pardons saved for the current week.
 */
export function useWhiskyExemptions(
  weekKey: string,
  players: Player[],
  matches: Match[]
): WhiskyExemptionState {
  const [manualIds, setManualIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const autoLoser = useMemo(() => latestTournamentLoser(players, matches), [players, matches])

  const refresh = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setLoading(false)
      return
    }
    try {
      setManualIds(await fetchManualExemptions(weekKey))
    } catch {
      // settings table missing → no manual exemptions
      setManualIds([])
    } finally {
      setLoading(false)
    }
  }, [weekKey])

  useEffect(() => {
    void refresh()
    if (!hasSupabaseConfig()) return
    return subscribeToManualExemptions(weekKey, setManualIds)
  }, [refresh, weekKey])

  const toggle = useCallback(
    async (playerId: string, exempt: boolean) => {
      setManualIds((prev) =>
        exempt ? [...new Set([...prev, playerId])] : prev.filter((id) => id !== playerId)
      )
      try {
        await setManualExemption(weekKey, playerId, exempt)
      } catch {
        // settings table missing — keep the optimistic in-memory state
      }
    },
    [weekKey]
  )

  const exemptIds = useMemo(
    () => new Set([...(autoLoser ? [autoLoser.playerId] : []), ...manualIds]),
    [autoLoser, manualIds]
  )

  const isAuto = useCallback((playerId: string) => autoLoser?.playerId === playerId, [autoLoser])

  return { loading, autoLoser, manualIds, exemptIds, isAuto, toggle }
}
