'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { BellOff, CalendarDays, ChevronLeft } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { assignBadges, computePlayerStats } from '@/lib/supabase/stats'
import { formatWeekKey } from '@/lib/utils/dateHelpers'
import { activeFirst } from '@/lib/utils/sortHelpers'
import { regularsOnly } from '@/lib/utils/playerHelpers'

/**
 * Last week's leaderboard — the most recent gameweek that actually had
 * matches, ranked by points. Replaces the old all-time board at the top of the
 * home page; the full all-time history stays on /standings.
 */
export function LastWeekBoard() {
  const { players, matches, loading, error } = useTournamentData()
  const { nicknameFor, jabFor } = useRosterSettings()

  const { weekKey, rows } = useMemo(() => {
    const active = matches.filter((m) => !m.deleted_at)
    const weeks = [...new Set(active.map((m) => m.week_start_date))].sort((a, b) => b.localeCompare(a))
    const latest = weeks[0] ?? null
    if (!latest) return { weekKey: null, rows: [] }

    const weekMatches = active.filter((m) => m.week_start_date === latest)
    const withStats = regularsOnly(players)
      .map((p) => ({ p, s: computePlayerStats(weekMatches, p.id) }))
      .filter((r) => r.s.matches > 0)
      .sort(
        (a, b) =>
          activeFirst(a.p, b.p) ||
          b.s.points - a.s.points ||
          a.s.losses - b.s.losses ||
          b.s.winPercentage - a.s.winPercentage ||
          b.s.goalDifference - a.s.goalDifference
      )
    return { weekKey: latest, rows: withStats }
  }, [players, matches])

  const badges = useMemo(
    () => assignBadges(rows.map((r) => r.p), new Map(rows.map((r) => [r.p.id, r.s]))),
    [rows]
  )

  if (loading && players.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">טוען טבלה…</p>
  }
  if (error && players.length === 0) {
    return <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-bold">
            <CalendarDays className="h-4 w-4 text-primary" /> השבוע האחרון
          </h2>
          {weekKey && <p className="text-xs text-muted-foreground">{formatWeekKey(weekKey)}</p>}
        </div>
        <Link
          href="/standings"
          className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          כל הטבלאות
          <ChevronLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface py-8 text-center text-muted-foreground">
          אין משחקים בשבוע האחרון
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ p, s }, i) => {
            const badge = badges.get(p.id)
            return (
              <Link
                key={p.id}
                href={`/players/${p.id}`}
                className={`flex items-center gap-3 rounded-xl border bg-surface p-3 transition-colors duration-200 hover:border-primary/40 ${
                  i === 0 ? 'border-primary/30' : 'border-border'
                } ${p.is_active === false ? 'opacity-45 grayscale' : ''}`}
              >
                <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold tabular-nums text-muted-foreground">
                  <span className={p.is_active === false ? 'opacity-60' : ''}>
                    {i === 0 ? <span className="text-primary">{i + 1}</span> : i + 1}
                  </span>
                  {p.is_active === false && (
                    <BellOff className="absolute -top-1 -left-1 h-3 w-3 text-muted-foreground" />
                  )}
                </span>
                <Avatar name={p.name} src={p.profile_picture_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold">{p.name}</span>
                    {nicknameFor(p.name) && (
                      <span className="text-xs text-muted-foreground">{nicknameFor(p.name)}</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{jabFor(p.name)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-lg font-extrabold tabular-nums text-foreground">{s.points}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {badge && <span title={`${badge.title}: ${badge.detail}`}>{badge.emoji}</span>}
                    <span className="tabular-nums">
                      <span className="text-success">{s.wins}</span>/
                      <span className="text-draw">{s.draws}</span>/
                      <span className="text-destructive">{s.losses}</span>
                    </span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
