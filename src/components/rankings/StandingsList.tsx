'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { groupStandingsRows } from '@/lib/supabase/standings'
import type { StandingsRow } from '@/lib/types/database'

interface Props {
  rows: StandingsRow[]
}

function RowStats({ row }: { row: StandingsRow }) {
  const gd = row.goal_difference
  return (
    <div className="flex w-24 shrink-0 flex-col items-end text-left">
      <span className="text-[17px] font-bold tabular-nums leading-tight text-ink">{row.points}</span>
      <span className="text-[11px] tabular-nums text-ink-faint">
        {row.wins}נ · {row.draws}פ · {row.losses}ה{gd !== 0 && <span className="text-ink-mid"> · {gd > 0 ? '+' : ''}{gd}</span>}
      </span>
    </div>
  )
}

/** Position cell with rank number; placement bar tinted gold for the leader. */
function RankDiv({ rank, tied }: { rank: number; tied: boolean }) {
  return (
    <div className="relative flex w-7 shrink-0 items-start justify-center">
      {rank === 1 && <span className="absolute inset-y-0 right-1 w-[3px] rounded-full bg-gold" aria-hidden="true" />}
      <span
        className={`pt-0.5 text-[15px] font-bold tabular-nums leading-none ${
          tied ? 'text-ink-faint' : rank === 1 ? 'text-gold' : 'text-ink-mid'
        }`}
      >
        {tied ? '=' : rank}
      </span>
    </div>
  )
}

/**
 * Standings as a ranking list — player identity first, form carried by a compact
 * W/D/L line, points docked right (RTL end). Tied groups stack beneath their
 * anchor. Not a spreadsheet: rows breathe, the leader gets a gold standing tick.
 */
export function StandingsList({ rows }: { rows: StandingsRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="panel flex items-center justify-center py-12 text-ink-mid">אין נתונים לתקופה זו</div>
    )
  }

  const groups = groupStandingsRows(rows)

  return (
    <div className="overflow-hidden rounded-[20px] border border-lines bg-surface">
      <ul className="divide-y divide-lines-sid">
        {groups.map((group, index) => {
          const primary = group.primary
          const tiedRows = group.tied
          return (
            <Fragment key={primary.player_id}>
              <li>
                <Link
                  href={`/players/${primary.player_id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-raised/50"
                >
                  <RankDiv rank={index + 1} tied={false} />
                  <Avatar name={primary.player_name} src={primary.profile_picture_url} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                    {primary.player_name}
                  </span>
                  <RowStats row={primary} />
                </Link>
              </li>
              {tiedRows.map((t) => (
                <li key={t.player_id}>
                  <Link
                    href={`/players/${t.player_id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-raised/50"
                  >
                    <RankDiv rank={index + 1} tied />
                    <Avatar name={t.player_name} src={t.profile_picture_url} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">
                      {t.player_name}
                    </span>
                    <RowStats row={t} />
                  </Link>
                </li>
              ))}
            </Fragment>
          )
        })}
      </ul>
    </div>
  )
}