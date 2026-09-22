'use client'

import { Fragment, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatDayKeyShort } from '@/lib/utils/dateHelpers'
import type { StandingsRow } from '@/lib/types/database'
import type { PlayerMatchLine } from '@/lib/supabase/standings'

interface Props {
  rows: StandingsRow[]
  /** The player's scorelines for each tournament day, keyed by day. */
  matchesByDay: Map<string, PlayerMatchLine[]>
}

const RESULT_CLASS: Record<PlayerMatchLine['result'], string> = {
  W: 'text-success',
  D: 'text-draw',
  L: 'text-destructive',
}

/**
 * A single player's tournament-by-tournament record: one row per day they had a
 * result, expandable to the actual match scorelines of that tournament. Backs
 * the "my table" view on the standings page.
 */
export function PlayerTournamentTable({ rows, matchesByDay }: Props) {
  const [openDays, setOpenDays] = useState<Set<string>>(new Set())

  function toggle(dayKey: string) {
    setOpenDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayKey)) next.delete(dayKey)
      else next.add(dayKey)
      return next
    })
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface py-8 text-center text-muted-foreground">
        השחקן הזה עוד לא שיחק
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-3 py-3 text-right font-medium">טורניר</th>
            <th className="px-2 py-3 text-center font-medium">משחקים</th>
            <th className="px-2 py-3 text-center font-medium">W/D/L</th>
            <th className="px-2 py-3 text-center font-medium">שערים</th>
            <th className="px-3 py-3 text-center font-medium">נקודות</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = openDays.has(row.day_key)
            const matches = matchesByDay.get(row.day_key) ?? []
            return (
              <Fragment key={row.day_key}>
                <tr
                  role="button"
                  tabIndex={0}
                  aria-expanded={open}
                  onClick={() => toggle(row.day_key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggle(row.day_key)
                    }
                  }}
                  className="cursor-pointer border-b border-border/50 transition-colors duration-200 last:border-0 hover:bg-accent/5"
                >
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                      {formatDayKeyShort(row.day_key)}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums">{row.matches_played}</td>
                  <td className="px-2 py-3 text-center tabular-nums">
                    <span className="text-success">{row.wins}</span>/
                    <span className="text-draw">{row.draws}</span>/
                    <span className="text-destructive">{row.losses}</span>
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums">
                    {row.goals_for}-{row.goals_against}
                  </td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums">{row.points}</td>
                </tr>
                {open && (
                  <tr className="border-b border-border/50 bg-background/40 last:border-0">
                    <td colSpan={5} className="px-3 pb-3 pt-1">
                      <ul className="flex flex-col gap-1">
                        {matches.length === 0 ? (
                          <li className="text-xs text-muted-foreground">אין משחקים להצגה</li>
                        ) : (
                          matches.map((m) => (
                            <li key={m.matchId} className="flex items-center justify-between gap-3 text-xs">
                              <span className="truncate text-muted-foreground">
                                מול {m.opponents}
                                {m.teamName ? ` · ${m.teamName}` : ''}
                              </span>
                              <span className="shrink-0 tabular-nums">
                                <span className={`font-bold ${RESULT_CLASS[m.result]}`}>{m.result}</span>{' '}
                                <span className="font-semibold text-foreground">
                                  {m.goalsFor}-{m.goalsAgainst}
                                </span>
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
