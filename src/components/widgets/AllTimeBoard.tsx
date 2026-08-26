'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { assignBadges, computePlayerStats } from '@/lib/supabase/stats'
import { activeFirst } from '@/lib/utils/sortHelpers'

/**
 * All-time leaderboard — ranked by points. Player identity first, points
 * docked right (RTL end), a gold standing tick for first place. Drives home.
 */
export function AllTimeBoard() {
  const { players, matches, loading, error } = useTournamentData()
  const { nicknameFor, jabFor } = useRosterSettings()

  const rows = useMemo(() => {
    const withStats = players.map((p) => ({ p, s: computePlayerStats(matches, p.id) }))
    return withStats
      .sort(
        (a, b) =>
          activeFirst(a.p, b.p) ||
          b.s.points - a.s.points ||
          a.s.losses - b.s.losses ||
          b.s.winPercentage - a.s.winPercentage ||
          b.s.goalDifference - a.s.goalDifference
      )
  }, [players, matches])

  const badges = useMemo(
    () => assignBadges(players, new Map(rows.map((r) => [r.p.id, r.s]))),
    [players, rows]
  )

  if (loading && players.length === 0) {
    return <p className="py-10 text-center text-ink-mid">טוען טבלה…</p>
  }
  if (error && players.length === 0) {
    return <p className="panel p-4 text-loss">{error}</p>
  }
  if (rows.length === 0) {
    return <div className="panel flex items-center justify-center py-10 text-ink-mid">אין שחקנים עדיין</div>
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-lines bg-surface">
      <ul className="divide-y divide-lines-sid">
        {rows.map(({ p, s }, i) => {
          const badge = badges.get(p.id)
          return (
            <li key={p.id}>
              <Link
                href={`/players/${p.id}`}
                className={`relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-raised/50 ${
                  p.is_active === false ? 'opacity-45 grayscale' : ''
                }`}
              >
                {i === 0 && <span className="absolute inset-y-0 right-0 w-[3px] bg-gold" aria-hidden="true" />}
                <RankBadge rank={i + 1} />
                <Avatar name={p.name} src={p.profile_picture_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[15px] font-medium text-ink">{p.name}</span>
                    {nicknameFor(p.name) && (
                      <span className="truncate text-[11px] text-ink-mid">{nicknameFor(p.name)}</span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-ink-faint">{badge ? `${badge.emoji} ${badge.title} · ` : ''}{jabFor(p.name)}</p>
                </div>
                <div className="flex w-24 shrink-0 flex-col items-end">
                  <span className="text-[17px] font-bold tabular-nums leading-tight text-ink">{s.points}</span>
                  <span className="text-[11px] tabular-nums text-ink-faint">{s.wins}/{s.draws}/{s.losses}</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Rank cell: cheap gold medal for 1st, quiet number otherwise. */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gold text-[13px] font-black leading-none text-gold-ink">
        {'🥇'}
      </span>
    )
  }
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-bold tabular-nums ${rank === 2 ? 'text-ink' : rank === 3 ? 'text-ink-mid' : 'text-ink-faint'}`}>
      {rank}
    </span>
  )
}