'use client'

import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import type { StandingsRow } from '@/lib/types/database'

const MEDALS = ['🥇', '🥈', '🥉']

export function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface py-10 text-center text-muted-foreground">
        אין נתונים לתקופה זו
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-3 py-3 text-right font-medium">#</th>
            <th className="px-3 py-3 text-right font-medium">שחקן</th>
            <th className="px-2 py-3 text-center font-medium">משחקים</th>
            <th className="px-2 py-3 text-center font-medium">נ/פ/ה</th>
            <th className="px-2 py-3 text-center font-medium">שערים</th>
            <th className="px-2 py-3 text-center font-medium">פרשים</th>
            <th className="px-3 py-3 text-center font-medium">נקודות</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.player_id} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-3">{i + 1 <= 3 ? MEDALS[i] : i + 1}</td>
              <td className="px-3 py-3">
                <Link href={`/players/${row.player_id}`} className="flex items-center gap-2 hover:underline">
                  <Avatar name={row.player_name} src={row.profile_picture_url} size="sm" />
                  <span className="font-medium">{row.player_name}</span>
                </Link>
              </td>
              <td className="px-2 py-3 text-center tabular-nums">{row.matches_played}</td>
              <td className="px-2 py-3 text-center tabular-nums">
                <span className="text-success">{row.wins}</span>/
                <span className="text-draw">{row.draws}</span>/
                <span className="text-destructive">{row.losses}</span>
              </td>
              <td className="px-2 py-3 text-center tabular-nums">{row.goals_for}</td>
              <td className="px-2 py-3 text-center tabular-nums">
                <span className={row.goal_difference > 0 ? 'text-success' : row.goal_difference < 0 ? 'text-destructive' : ''}>
                  {row.goal_difference > 0 ? '+' : ''}
                  {row.goal_difference}
                </span>
              </td>
              <td className="px-3 py-3 text-center font-bold tabular-nums">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
