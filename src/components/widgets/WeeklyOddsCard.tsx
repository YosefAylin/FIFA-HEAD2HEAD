'use client'

import { useMemo } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { computePlayerStats } from '@/lib/supabase/stats'
import { computePlayerOddsAll } from '@/lib/supabase/odds'
import { POWER_RANK, WHISKY_RULE } from '@/lib/data/roster'
import { getRecentWeekKeys } from '@/lib/utils/dateHelpers'
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
  const { open, ended } = useTournamentGate()
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
          sessionEnded: ended,
        }))
        .filter((r) => r.history.matches > 0)
    )
  }, [players, matches, week, prevWeek, open, ended])

  if (rows.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-lines bg-raised/30 p-4 text-center text-sm text-ink-mid">
        עדיין אין מספיק משחקים לחישוב הסיכויים — בואו אחרי משחק ראשון ⚽
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-lines bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black tracking-tight text-ink">מי מפסיד ומביא השבוע? 🥃📉</h2>
        <span className="rounded-full bg-gold/12 px-2 py-0.5 text-[10px] font-medium text-gold">
          האחרון מביא וויסקי
        </span>
      </div>

      <p className="text-xs text-ink-mid">
        האחוז מבוסס על השבוע הנוכחי + קודם + היסטורי כל הזמנים ודירוג כוח — מי שנמוך יותר מביא את הוויסקי. לא תוצאת
        בטוח.
      </p>

      <p className="rounded-lg bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">{WHISKY_RULE}</p>

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-lines bg-raised/40 p-3">
            <Avatar name={r.name} src={r.photo} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-ink">{r.name}</span>
                <span className="flex items-center gap-1 tabular-nums text-xs text-ink-mid">
                  🥃 <span className="font-bold text-gold">{r.odds}%</span>
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-mid">
                <span className="shrink-0">להביא וויסקי</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                  <div
                    className={`h-full rounded-full ${r.odds > 50 ? 'bg-gold' : 'bg-gold/40'}`}
                    style={{ width: `${r.odds}%` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-left tabular-nums">{r.odds}%</span>
              </div>
              <p className="mt-1.5 truncate text-[11px] text-ink-faint">{r.reason}</p>
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