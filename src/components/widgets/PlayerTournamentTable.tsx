'use client'

import { formatDayKeyShort } from '@/lib/utils/dateHelpers'
import type { StandingsRow } from '@/lib/types/database'

/**
 * A single player's tournament-by-tournament record: one row per day they had a
 * result. Backs the "my table" view on the standings page.
 */
export function PlayerTournamentTable({ rows }: { rows: StandingsRow[] }) {
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
          {rows.map((row) => (
            <tr key={row.day_key} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-3">{formatDayKeyShort(row.day_key)}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
