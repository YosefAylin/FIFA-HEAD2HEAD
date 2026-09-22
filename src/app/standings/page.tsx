'use client'

import { useMemo, useState } from 'react'
import { StandingsTable } from '@/components/widgets/StandingsTable'
import { DaySelector } from '@/components/widgets/DaySelector'
import { PlayerFilter } from '@/components/widgets/PlayerFilter'
import { PlayerTournamentTable } from '@/components/widgets/PlayerTournamentTable'
import {
  buildAllTimeStandings,
  buildDayStandings,
  buildPlayerTournamentHistory,
  lastPlayerTournament,
  playerMatchesInDay,
  type PlayerMatchLine,
} from '@/lib/supabase/standings'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { distinctDayKeys, formatDayKey } from '@/lib/utils/dateHelpers'
import { activeFirst } from '@/lib/utils/sortHelpers'
import type { Match, StandingsRow } from '@/lib/types/database'

const MEDALS = ['🥇', '🥈', '🥉']

/** Every player who took part in a match (1v1 = 2, 2v2 = 4). */
function participants(m: Match): string[] {
  return [m.home_player_1_id, m.home_player_2_id, m.away_player_1_id, m.away_player_2_id].filter(
    (id): id is string => Boolean(id)
  )
}

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

  // Unfiltered board — only used to know which players get a checkbox, so the
  // options stay put even after a player is unchecked.
  const baseRows = useMemo(
    () => (day === null ? buildAllTimeStandings(players, matches) : buildDayStandings(players, matches, day)),
    [players, matches, day]
  )

  // Checking players off removes them entirely: any match they featured in is
  // dropped, so their opponents' stats no longer count results against them.
  const countedMatches = useMemo(() => {
    if (excluded.size === 0) return matches
    return matches.filter((m) => !participants(m).some((id) => excluded.has(id)))
  }, [matches, excluded])

  const rows = useMemo(
    () =>
      day === null
        ? buildAllTimeStandings(players, countedMatches)
        : buildDayStandings(players, countedMatches, day),
    [players, countedMatches, day]
  )

  const title = day === null ? 'טבלה כללית' : 'טבלת היום'

  // Greyed-out (inactive) players sort last.
  const sortedRows = useMemo(() => {
    const inactive = new Set(players.filter((p) => p.is_active === false).map((p) => p.id))
    const rank = (r: StandingsRow) => (inactive.has(r.player_id) ? 1 : 0)
    return [...rows].sort((a, b) => rank(a) - rank(b))
  }, [rows, players])

  const filterOptions = useMemo(
    () => baseRows.map((r) => ({ id: r.player_id, name: r.player_name })),
    [baseRows]
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

  const lastResult = useMemo(
    () => (myPlayer ? lastPlayerTournament(myPlayer, players, matches) : null),
    [myPlayer, players, matches]
  )

  // Scorelines per tournament, for the expandable rows.
  const myMatchesByDay = useMemo(() => {
    const map = new Map<string, PlayerMatchLine[]>()
    if (!myPlayer) return map
    for (const r of myRows) {
      map.set(r.day_key, playerMatchesInDay(matches, players, myPlayer.id, r.day_key))
    }
    return map
  }, [myPlayer, myRows, matches, players])

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
        <StandingsTable rows={sortedRows} />
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
          <>
            {lastResult && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    הטורניר האחרון · {formatDayKey(lastResult.dayKey)}
                  </p>
                  <p className="text-lg font-bold">
                    {lastResult.rank <= MEDALS.length && <span className="me-1">{MEDALS[lastResult.rank - 1]}</span>}
                    מקום {lastResult.rank} מתוך {lastResult.fieldSize}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold tabular-nums">{lastResult.row.points} נק׳</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {lastResult.row.wins}/{lastResult.row.draws}/{lastResult.row.losses}
                  </p>
                </div>
              </div>
            )}
            <PlayerTournamentTable rows={myRows} matchesByDay={myMatchesByDay} />
          </>
        ) : (
          <p className="rounded-xl border border-border bg-surface py-8 text-center text-muted-foreground">
            בחרו שחקן כדי לראות את הטורנירים שבהם שיחק
          </p>
        )}
      </section>
    </div>
  )
}
