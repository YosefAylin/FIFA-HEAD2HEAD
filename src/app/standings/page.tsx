'use client'

import { useEffect, useMemo, useState } from 'react'
import { StandingsTable } from '@/components/widgets/StandingsTable'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { WeekSelector } from '@/components/widgets/WeekSelector'
import { fetchAllTimeStandings, fetchStandings } from '@/lib/supabase/standings'
import { fetchPlayers } from '@/lib/supabase/players'
import { fetchWeekKeys } from '@/lib/supabase/matches'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import type { StandingsRow } from '@/lib/types/database'

export default function StandingsPage() {
  const [weeks, setWeeks] = useState<string[]>([])
  const [week, setWeek] = useState<string | null>(getCurrentWeekKey())
  const [rows, setRows] = useState<StandingsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Greyed-out (inactive) players sort last. StandingsRow has no is_active
  // flag, so mark them from a client-side fetch of the players table.
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    void fetchPlayers()
      .then((ps) => setInactiveIds(new Set(ps.filter((p) => p.is_active === false).map((p) => p.id))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    void fetchWeekKeys()
      .then((keys) => {
        setWeeks(keys)
        setWeek((w) => w ?? keys[0] ?? null)
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    setLoading(true)
    const fetcher = week === null ? fetchAllTimeStandings() : fetchStandings(week)
    fetcher
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'שגיאה'))
      .finally(() => setLoading(false))
  }, [week])

  const title = useMemo(
    () => (week === null ? 'טבלה כללית' : 'טבלת השבוע'),
    [week]
  )

  // Keep the standings order the API computed, but push inactive rows last.
  const sortedRows = useMemo(() => {
    const rank = (r: StandingsRow) => (inactiveIds.has(r.player_id) ? 1 : 0)
    return [...rows].sort((a, b) => rank(a) - rank(b))
  }, [rows, inactiveIds])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{title}</h1>
          <ThemeToggle className="h-9 w-9 md:h-8 md:w-8" />
        </div>
        <WeekSelector weeks={weeks} value={week} onChange={setWeek} />
      </div>

      {error && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-muted-foreground">טוען טבלה…</p>
      ) : (
        <StandingsTable rows={sortedRows} />
      )}
    </div>
  )
}
