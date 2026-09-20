'use client'

import { useMemo, useState } from 'react'
import { StandingsTable } from '@/components/widgets/StandingsTable'
import { DaySelector } from '@/components/widgets/DaySelector'
import { buildAllTimeStandings, buildDayStandings } from '@/lib/supabase/standings'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { distinctDayKeys } from '@/lib/utils/dateHelpers'
import type { StandingsRow } from '@/lib/types/database'

export default function StandingsPage() {
  const { players, matches, loading, error } = useTournamentData()
  // null = all-time. A tournament day runs 02:00 -> 02:00, so a session past
  // midnight still belongs to the same day.
  const [day, setDay] = useState<string | null>(null)

  const days = useMemo(() => distinctDayKeys(matches), [matches])

  const rows = useMemo(
    () => (day === null ? buildAllTimeStandings(players, matches) : buildDayStandings(players, matches, day)),
    [players, matches, day]
  )

  const title = day === null ? 'טבלה כללית' : 'טבלת היום'

  // Greyed-out (inactive) players sort last.
  const sortedRows = useMemo(() => {
    const inactive = new Set(players.filter((p) => p.is_active === false).map((p) => p.id))
    const rank = (r: StandingsRow) => (inactive.has(r.player_id) ? 1 : 0)
    return [...rows].sort((a, b) => rank(a) - rank(b))
  }, [rows, players])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <DaySelector days={days} value={day} onChange={setDay} />
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
