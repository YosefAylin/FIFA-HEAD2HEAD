'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { assignBadges, computePlayerStats } from '@/lib/supabase/stats'

const MEDALS = ['🥇', '🥈', '🥉']

/**
 * All-time leaderboard: every match ever played, ranked by points.
 * Compact rows with nickname + one-line jab. Drives the homepage.
 */
export function AllTimeBoard() {
  const { players, matches, loading, error } = useTournamentData()
  const { nicknameFor, jabFor } = useRosterSettings()

  const rows = useMemo(() => {
    const withStats = players.map((p) => ({ p, s: computePlayerStats(matches, p.id) }))
    return withStats
      .sort((a, b) => b.s.points - a.s.points || b.s.goalDifference - a.s.goalDifference)
      .map(({ p, s }) => ({ p, s }))
  }, [players, matches])

  const badges = useMemo(
    () => assignBadges(players, new Map(rows.map((r) => [r.p.id, r.s]))),
    [players, rows]
  )

  if (loading && players.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">טוען טבלה…</p>
  }
  if (error && players.length === 0) {
    return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>
  }
  if (rows.length === 0) {
    return <p className="rounded-xl border border-border bg-surface py-8 text-center text-muted-foreground">אין שחקנים עדיין</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ p, s }, i) => {
        const badge = badges.get(p.id)
        return (
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            className={`flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-primary/50 ${
              p.is_active === false ? 'opacity-45 grayscale' : ''
            }`}
          >
            <span className="relative w-7 text-center text-xl">
              <span className={p.is_active === false ? 'opacity-60' : ''}>{i < 3 ? MEDALS[i] : i + 1}</span>
              {p.is_active === false && <span className="absolute -top-1 -left-1 text-[8px]">🔕</span>}
            </span>
            <Avatar name={p.name} src={p.profile_picture_url} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-bold">{p.name}</span>
                {nicknameFor(p.name) && <span className="text-xs text-muted-foreground">{nicknameFor(p.name)}</span>}
              </div>
              <p className="truncate text-xs text-muted-foreground">{jabFor(p.name)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-lg font-extrabold tabular-nums">{s.points}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {badge && <span title={`${badge.title}: ${badge.detail}`}>{badge.emoji}</span>}
                <span className="tabular-nums">{s.wins}/{s.draws}/{s.losses}</span>
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}