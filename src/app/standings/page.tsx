'use client'

import { useMemo, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { StandingsTable } from '@/components/widgets/StandingsTable'
import { DaySelector } from '@/components/widgets/DaySelector'
import { PlayerFilter } from '@/components/widgets/PlayerFilter'
import { PlayerTournamentTable } from '@/components/widgets/PlayerTournamentTable'
import {
  buildAllTimeStandings,
  buildDayStandings,
  buildPlayerTournamentHistory,
  groupStandingsRows,
  playerMatchesInDay,
  type PlayerMatchLine,
} from '@/lib/supabase/standings'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { mostRoundWins, mostTechnicalWins, type AchievementLeader } from '@/lib/supabase/recap'
import { TieNames } from '@/components/widgets/TieNames'
import {
  distinctDayKeys,
  formatDayKey,
  getCurrentTournamentDayKey,
  matchDayKey,
} from '@/lib/utils/dateHelpers'
import { activeFirst } from '@/lib/utils/sortHelpers'
import type { Match, StandingsRow } from '@/lib/types/database'

const MEDALS = ['🥇', '🥈', '🥉']

/** Small leader tile (most technical wins / most round sweeps) for the selected table. */
function LeaderCard({
  label,
  leader,
  photo,
}: {
  label: string
  leader: AchievementLeader
  photo: string | null
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <Avatar name={leader.name} src={photo} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <div className="truncate text-sm font-bold">
          <TieNames name={leader.name} tie={leader.tie} />
        </div>
        {leader.others.length > 0 && (
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            עוד: {leader.others.map((o) => `${o.name} (${o.count})`).join(' · ')}
          </p>
        )}
      </div>
      <span className="shrink-0 text-2xl font-extrabold tabular-nums text-foreground">{leader.count}</span>
    </div>
  )
}

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
  // Until the user picks something, follow the ongoing/latest tournament.
  const [dayTouched, setDayTouched] = useState(false)
  // Table view: players left out of the standings (empty = everyone counts).
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  // "My table": the player whose tournament history is on show, '' = none.
  const [myPlayerId, setMyPlayerId] = useState('')

  const days = useMemo(() => distinctDayKeys(matches), [matches])

  // Default: today's session when it has results, otherwise the latest one.
  const currentDayKey = getCurrentTournamentDayKey()
  const defaultDay = useMemo(
    () => (days.includes(currentDayKey) ? currentDayKey : (days[0] ?? null)),
    [days, currentDayKey]
  )
  const selectedDay = dayTouched ? day : defaultDay

  // Unfiltered board — only used to know which players get a checkbox, so the
  // options stay put even after a player is unchecked.
  const baseRows = useMemo(
    () =>
      selectedDay === null
        ? buildAllTimeStandings(players, matches)
        : buildDayStandings(players, matches, selectedDay),
    [players, matches, selectedDay]
  )

  // Checking players off removes them entirely: any match they featured in is
  // dropped, so their opponents' stats no longer count results against them.
  const countedMatches = useMemo(() => {
    if (excluded.size === 0) return matches
    return matches.filter((m) => !participants(m).some((id) => excluded.has(id)))
  }, [matches, excluded])

  const rows = useMemo(
    () =>
      selectedDay === null
        ? buildAllTimeStandings(players, countedMatches)
        : buildDayStandings(players, countedMatches, selectedDay),
    [players, countedMatches, selectedDay]
  )

  // The selected table also drives the achievement leaders: the day's matches,
  // or every match for the all-time view.
  const scopeMatches = useMemo(
    () =>
      selectedDay === null
        ? countedMatches
        : countedMatches.filter((m) => matchDayKey(m.created_at) === selectedDay),
    [countedMatches, selectedDay]
  )
  const technicalLeader = useMemo(
    () => mostTechnicalWins(scopeMatches, players),
    [scopeMatches, players]
  )
  const roundLeader = useMemo(() => mostRoundWins(scopeMatches, players), [scopeMatches, players])

  const title =
    selectedDay === null
      ? 'טבלה כללית'
      : selectedDay === currentDayKey
        ? 'טבלת היום'
        : 'טבלת הטורניר'

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

  const myHistory = useMemo(
    () => (myPlayer ? buildPlayerTournamentHistory(myPlayer, countedMatches) : []),
    [myPlayer, countedMatches]
  )

  // The personal summary follows the selected table: the player's placement in
  // that day / all-time, not their latest unrelated tournament.
  const mySelected = useMemo(() => {
    if (!myPlayer) return null
    const groups = groupStandingsRows(rows)
    const index = groups.findIndex(
      (g) => g.primary.player_id === myPlayer.id || g.tied.some((t) => t.player_id === myPlayer.id)
    )
    const row = rows.find((r) => r.player_id === myPlayer.id)
    if (!row || index === -1) return null
    return { dayKey: selectedDay ?? '', row, rank: index + 1, fieldSize: rows.length }
  }, [myPlayer, rows, selectedDay])

  const myTableRows = useMemo(
    () => (selectedDay === null ? myHistory : mySelected ? [mySelected.row] : []),
    [selectedDay, myHistory, mySelected]
  )

  // Scorelines per tournament, for the expandable rows.
  const myMatchesByDay = useMemo(() => {
    const map = new Map<string, PlayerMatchLine[]>()
    if (!myPlayer) return map
    for (const r of myTableRows) {
      map.set(r.day_key, playerMatchesInDay(countedMatches, players, myPlayer.id, r.day_key))
    }
    return map
  }, [myPlayer, myTableRows, countedMatches, players])

  const photoFor = (name: string) =>
    players.find((p) => p.name === name)?.profile_picture_url ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <DaySelector
          days={days}
          value={selectedDay}
          onChange={(next) => {
            setDayTouched(true)
            setDay(next)
          }}
        />
      </div>

      {error && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>}

      {(technicalLeader || roundLeader) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {technicalLeader && (
            <LeaderCard
              label="הכי הרבה טכני"
              leader={technicalLeader}
              photo={photoFor(technicalLeader.name)}
            />
          )}
          {roundLeader && (
            <LeaderCard
              label="הכי הרבה סבבים"
              leader={roundLeader}
              photo={photoFor(roundLeader.name)}
            />
          )}
        </div>
      )}

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
          <h2 className="text-lg font-bold">
            הטבלה שלי
            <span className="ms-1.5 text-xs font-normal text-muted-foreground">· לפי הטבלה הנבחרת</span>
          </h2>
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
            {mySelected ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {selectedDay === null
                      ? 'טבלת כל הזמנים'
                      : `הטורניר הנבחר · ${formatDayKey(selectedDay)}`}
                  </p>
                  <p className="text-lg font-bold">
                    {mySelected.rank <= MEDALS.length && <span className="me-1">{MEDALS[mySelected.rank - 1]}</span>}
                    מקום {mySelected.rank} מתוך {mySelected.fieldSize}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold tabular-nums">{mySelected.row.points} נק׳</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {mySelected.row.wins}/{mySelected.row.draws}/{mySelected.row.losses}
                  </p>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-surface/50 py-6 text-center text-sm text-muted-foreground">
                {selectedDay === null ? 'אין נתונים לשחקן הזה' : 'השחקן לא שיחק בטורניר הנבחר'}
              </p>
            )}
            {myTableRows.length > 0 && (
              <PlayerTournamentTable rows={myTableRows} matchesByDay={myMatchesByDay} />
            )}
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
