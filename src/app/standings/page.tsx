'use client'

import { useMemo, useState } from 'react'
import { StandingsTable } from '@/components/widgets/StandingsTable'
import { DaySelector } from '@/components/widgets/DaySelector'
import { PlayerFilter } from '@/components/widgets/PlayerFilter'
import { PlayerTournamentTable } from '@/components/widgets/PlayerTournamentTable'
import { buildAllTimeStandings, buildDayStandings, buildPlayerTournamentHistory } from '@/lib/supabase/standings'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { distinctDayKeys } from '@/lib/utils/dateHelpers'
import { activeFirst } from '@/lib/utils/sortHelpers'
import type { StandingsRow } from '@/lib/types/database'

export default function StandingsPage() {
  const { players, matches, loading, error } = useTournamentData()
  // null = all-time. A tournament day runs 02:00 -> 02:00, so a session past
  // midnight still belongs to the same day.
  const [day, setDay] = useState<string | null>(null)
  // Table view: players left out of the standings (empty = everyone counts).
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  // "My table": the player whose tournament history is on show, '' = none.
  const [myPlayerId, setMyPlayerId] = useState('')

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

  // Only players actually on the board get a checkbox; the filter applies on top.
  const filterOptions = useMemo(
    () => rows.map((r) => ({ id: r.player_id, name: r.player_name })),
    [rows]
  )

  const visibleRows = useMemo(
    () => sortedRows.filter((r) => !excluded.has(r.player_id)),
    [sortedRows, excluded]
  )

  function togglePlayer(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const playerOptions = useMemo(
    () => [...players].sort((a, b) => activeFirst(a, b) || a.name.localeCompare(b.name)),
    [players]
  )

  const myPlayer = useMemo(
    () => players.find((p) => p.id === myPlayerId) ?? null,
    [players, myPlayerId]
  )

  const myRows = useMemo(
    () => (myPlayer ? buildPlayerTournamentHistory(myPlayer, matches) : []),
    [myPlayer, matches]
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <DaySelector days={days} value={day} onChange={setDay} />
      </div>

      {error && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>}

      {!loading && filterOptions.length > 0 && (
        <PlayerFilter
          options={filterOptions}
          excludedIds={excluded}
          onToggle={togglePlayer}
          onAll={() => setExcluded(new Set())}
          onNone={() => setExcluded(new Set(filterOptions.map((o) => o.id)))}
        />
      )}

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">טוען טבלה…</p>
      ) : (
        <StandingsTable rows={visibleRows} />
      )}

      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">הטבלה שלי</h2>
          <select
            value={myPlayerId}
            onChange={(e) => setMyPlayerId(e.target.value)}
            className="h-12 w-full max-w-xs rounded-xl border border-input bg-background px-3 text-base transition-all duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="בחר שחקן להצגת הטורנירים שלו"
          >
            <option value="">בחר שחקן…</option>
            {playerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {myPlayer ? (
          <PlayerTournamentTable rows={myRows} />
        ) : (
          <p className="rounded-xl border border-border bg-surface py-8 text-center text-muted-foreground">
            בחרו שחקן כדי לראות את הטורנירים שבהם שיחק
          </p>
        )}
      </section>
    </div>
  )
}
