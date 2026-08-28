'use client'

import { useMemo } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { computePlayerStats } from '@/lib/supabase/stats'
import { computePlayerOddsAll } from '@/lib/supabase/odds'
import { POWER_RANK, WHISKY_RULE } from '@/lib/data/roster'
import { getCurrentWeekKey, getRecentWeekKeys } from '@/lib/utils/dateHelpers'
import type { PlayerOdds } from '@/lib/supabase/odds'

/**
 * A playful but data-grounded "who's losing / who's buying the whisky" card.
 *
 * One 0–100 chance per player ("they lose this week" = "they buy the whisky" —
 * whoever ends up last owes a bottle), computed by the pure
 * `computePlayerOddsAll` engine which blends:
 *  - the CURRENT GAMEWEEK — weighted heavily while the gate is open
 *  - LAST GAMEWEEK — the recent-form signal
 *  - HISTORY (all sessions combined) as the steady baseline
 *  - the FROZEN power rank from the roster (יוסף→ליאור→אשגרה→ספי…), live-nudged
 *    by season form — so the group's own pecking order shapes the odds
 *
 * No WhatsApp-chat signal — the card is stats only. Percentages are a flavor
 * stat, not a betting line. Player photo + a one-line reason shown.
 */
export function WeeklyOddsCard() {
  const { players, matches } = useTournamentData()
  const { open } = useTournamentGate()
  const [week, prevWeek] = getRecentWeekKeys(2)

  const rows = useMemo<PlayerOdds[]>(() => {
    const weekMatches = matches.filter((m) => m.week_start_date === week && !m.deleted_at)
    const prevMatches = matches.filter((m) => m.week_start_date === prevWeek && !m.deleted_at)
    const active = players.filter((p) => p.is_active !== false)
    const n = Math.max(1, POWER_RANK.length)

    return computePlayerOddsAll(
      active
        .map((p) => ({
          id: p.id,
          name: p.name,
          photo: p.profile_picture_url,
          season: computePlayerStats(weekMatches, p.id),
          previous: computePlayerStats(prevMatches, p.id),
          history: computePlayerStats(matches, p.id),
          // Frozen position → 0..1 (best first). Unranked players hit the back.
          powerPos: normalizePosition(POWER_RANK.indexOf(p.name), n),
          tournamentOpen: open,
        }))
        .filter((r) => r.history.matches > 0)
    )
  }, [players, matches, week, prevWeek, open])

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-center text-sm text-muted-foreground">
        עדיין אין מספיק משחקים לחישוב הסיכויים — בואו אחרי משחק ראשון ⚽
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">מי מליב ולא עוזר השבוע? 🥃📉</h2>
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">האחרון מביא וויסקי</span>
      </div>

      <p className="text-xs text-muted-foreground">
        מי סביר שיניח את הוויסקי בסוף השבוע — השבוע הנוכחי + קודם + היסטוריה ודירוג כוח.
      </p>

      <p className="text-xs font-semibold text-accent bg-accent/10 rounded-lg px-2.5 py-1">
        {WHISKY_RULE}
      </p>

      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2 transition-shadow duration-200 hover:shadow-md"
          >
            <Avatar name={r.name} src={r.photo} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold">{r.name}</span>
                <span className="shrink-0 tabular-nums text-base font-extrabold text-accent">🥃 {r.odds}%</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${r.odds}%` }} />
                </div>
                <span className="truncate">{r.reason}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** index → 0..1 (best first). Unranked names get 1 (worst). */
function normalizePosition(idx: number, n: number): number {
  if (idx === -1) return 1
  return idx / (n - 1 || 1)
}