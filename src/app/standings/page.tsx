'use client'

import { useEffect, useMemo, useState } from 'react'
import { StandingsList } from '@/components/rankings/StandingsList'
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

  const title = useMemo(() => (week === null ? 'הטבלה הכללית' : 'טבלת השבוע'), [week])

  const sortedRows = useMemo(() => {
    const rank = (r: StandingsRow) => (inactiveIds.has(r.player_id) ? 1 : 0)
    return [...rows].sort((a, b) => rank(a) - rank(b))
  }, [rows, inactiveIds])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-mid">הטבלה של הקובה — מי מוביל, מי מזנק, מי בשפל</p>
        </div>
        <WeekSelector weeks={weeks} value={week} onChange={setWeek} />
      </div>

      {error && <p className="panel p-4 text-loss">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-ink-mid">טוען טבלה…</p>
      ) : (
        <StandingsList rows={sortedRows} />
      )}
    </div>
  )
}