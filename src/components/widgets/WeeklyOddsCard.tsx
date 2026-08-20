'use client'

import { useMemo } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { computePlayerStats } from '@/lib/supabase/stats'
import { computePlayerOddsAll } from '@/lib/supabase/odds'
import { POWER_RANK } from '@/lib/data/roster'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import type { PlayerOdds } from '@/lib/supabase/odds'

/**
 * A playful but data-grounded "who's buying / who's losing" card for the week.
 *
 * Odds per player, each 0–100, computed by the pure `computePlayerOddsAll`
 * engine which blends:
 *  - the CURRENT WEEK (the session in progress) — weighted heavily while the
 *    tournament gate is open, so a mid-run bad week moves you fast
 *  - HISTORY (all previous sessions combined) as the steady baseline
 *  - the FROZEN power rank from the roster (יוסף→ליאור→אשגרה→ספי…), live-nudged
 *    by season form — so the group's own pecking order shapes the odds
 *
 * No WhatsApp-chat signal — the card is stats only. Percentages are a flavor
 * stat, not a betting line. Player photo + a one-line reason shown.
 */
export function WeeklyOddsCard() {
  const { players, matches } = useTournamentData()
  const { open } = useTournamentGate()
  const week = getCurrentWeekKey()

  const rows = useMemo<PlayerOdds[]>(() => {
    const weekMatches = matches.filter((m) => m.week_start_date === week && !m.deleted_at)
    const active = players.filter((p) => p.is_active !== false)
    const n = Math.max(1, POWER_RANK.length)

    return computePlayerOddsAll(
      active
        .map((p) => ({
          id: p.id,
          name: p.name,
          photo: p.profile_picture_url,
          season: computePlayerStats(weekMatches, p.id),
          history: computePlayerStats(matches, p.id),
          // Frozen position → 0..1 (best first). Unranked players hit the back.
          powerPos: normalizePosition(POWER_RANK.indexOf(p.name), n),
          tournamentOpen: open,
        }))
        .filter((r) => r.history.matches > 0)
    )
  }, [players, matches, week, open])

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
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">לפי היסטוריה + דירוג כוח</span>
      </div>

      <p className="text-xs text-muted-foreground">
        האחוזים מבוססים על היסטורי כל הזמנים, הצורה אחרונה (5 המשחקים) ודירוג כוח — לא תוצאת בטוח.
      </p>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <Avatar name={r.name} src={r.photo} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold">{r.name}</span>
                <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                  <span title="להביא וויסקי">🥃 {r.whisky}%</span>
                  <span className="text-destructive" title="להפקיד">📉 {r.lose}%</span>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-1.5 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>וויסקי</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${r.whisky}%` }} />
                  </div>
                  <span className="tabular-nums w-8 text-left">{r.whisky}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>להפקיד</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-destructive" style={{ width: `${r.lose}%` }} />
                  </div>
                  <span className="tabular-nums w-8 text-left">{r.lose}%</span>
                </div>
              </div>
              <p className="mt-2 truncate text-[11px] text-muted-foreground">{r.reason}</p>
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