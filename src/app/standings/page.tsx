'use client'

import { useEffect, useMemo, useState } from 'react'
import { StandingsTable } from '@/components/widgets/StandingsTable'
import { WeekSelector } from '@/components/widgets/WeekSelector'
import { fetchAllTimeStandings, fetchStandings } from '@/lib/supabase/standings'
import { fetchWeekKeys } from '@/lib/supabase/matches'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import type { StandingsRow } from '@/lib/types/database'

export default function StandingsPage() {
  const [weeks, setWeeks] = useState<string[]>([])
  const [week, setWeek] = useState<string | null>(getCurrentWeekKey())
  const [rows, setRows] = useState<StandingsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <WeekSelector weeks={weeks} value={week} onChange={setWeek} />
      </div>

      {error && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-muted-foreground">טוען טבלה…</p>
      ) : (
        <StandingsTable rows={rows} />
      )}
    </div>
  )
}
