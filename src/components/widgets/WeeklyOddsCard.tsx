'use client'

import { useMemo } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import { computePlayerStats } from '@/lib/supabase/stats'
import { computePlayerOddsAll, recentFormScore } from '@/lib/supabase/odds'
import { POWER_RANK, rosterFor } from '@/lib/data/roster'
import { getRecentWeekKeys } from '@/lib/utils/dateHelpers'
import type { PlayerOdds } from '@/lib/supabase/odds'

/**
 * A playful but data-grounded "who's bringing the whisky next week" card.
 *
 * One 0–100 chance per player ("they end up last" = "they bring the bottle"),
 * computed by the pure `computePlayerOddsAll` engine which blends:
 *  - the CURRENT GAMEWEEK — weighted heavily while the gate is open
 *  - LAST GAMEWEEK — the recent-form signal
 *  - HISTORY (all sessions combined) as the steady baseline
 *  - the FROZEN power rank from the roster (יוסף→ליאור→אשגרה→ספי…), live-nudged
 *    by season form — so the group's own pecking order shapes the odds
 *
 * As the Saturday session counts down to the ~21:00 cut, the weights tilt
 * toward history + power rank (the "final sort"). A 🔥/🧊 chip marks hot/cold
 * streaks from each player's last-5 form. Player photo + the model-authored
 * live jab (falling back to the engine's position reason) shown.
 *
 * No WhatsApp-chat signal — the card is stats only. Percentages are a flavor
 * stat, not a betting line.
 */
export function WeeklyOddsCard() {
  const { players, matches } = useTournamentData()
  const { open, remainingFraction } = useTournamentGate()
  const { jabFor } = useRosterSettings()
  const [week, prevWeek] = getRecentWeekKeys(2)

  const { rows, formScore } = useMemo(() => {
    const weekMatches = matches.filter((m) => m.week_start_date === week && !m.deleted_at)
    const prevMatches = matches.filter((m) => m.week_start_date === prevWeek && !m.deleted_at)
    const active = players.filter((p) => p.is_active !== false)
    const n = Math.max(1, POWER_RANK.length)

    const inputs = active.map((p) => ({
      id: p.id,
      name: p.name,
      photo: p.profile_picture_url,
      season: computePlayerStats(weekMatches, p.id),
      previous: computePlayerStats(prevMatches, p.id),
      history: computePlayerStats(matches, p.id),
      // Frozen position → 0..1 (best first). Unranked players hit the back.
      powerPos: normalizePosition(POWER_RANK.indexOf(p.name), n),
      tournamentOpen: open,
      // Countdown tilt: live-shifting toward 0 at the ~21:00 cut (ignored by
      // the engine once the gate is closed).
      timeRemainingFraction: remainingFraction,
    }))
    const eligible = inputs.filter((r) => r.history.matches > 0)

    // Fire/cold from the current-week form — only meaningful once they've played.
    const formScore = new Map<string, number | undefined>(
      eligible.map((i) => [i.id, i.season.matches > 0 ? recentFormScore(i.season.form) : undefined])
    )
    return { rows: computePlayerOddsAll(eligible), formScore }
  }, [players, matches, week, prevWeek, open, remainingFraction])

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-center text-sm text-muted-foreground">
        עדיין אין מספיק משחקים לחישוב הסיכויים — בואו אחרי משחק ראשון ⚽
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-lg font-bold">מי יפנק אותנו שבוע הבא? 🥃</h2>

      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`flex items-center gap-2.5 rounded-xl border border-border ${rowTint(formScore.get(r.id))} px-3 py-2 transition-shadow duration-200 hover:shadow-md`}
          >
            <Avatar name={r.name} src={r.photo} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-bold">{r.name}</span>
                  <FormChip score={formScore.get(r.id)} />
                </span>
                <span className="shrink-0 tabular-nums text-base font-extrabold text-accent">🥃 {r.odds}%</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${r.odds}%` }} />
                </div>
                <span className="truncate">{sentenceFor(r, jabFor)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 🔥 hot streak / 🧊 cold streak chip from the last-5 form score (0..1). */
function FormChip({ score }: { score: number | undefined }) {
  if (score === undefined) return null
  if (score < 0.4) return <span className="text-xs" title="חם">🔥</span>
  if (score > 0.6) return <span className="text-xs" title="קר">🧊</span>
  return null
}

/** Whole-row tint from the last-5 form score — mirrors the FormChip thresholds. */
function rowTint(score: number | undefined): string {
  if (score === undefined) return 'bg-background'
  if (score < 0.4) return 'bg-success/10' // hot — green
  if (score > 0.6) return 'bg-destructive/10' // cold — red
  return 'bg-background'
}

/**
 * One-liner under the player: the model-authored live jab wins when present
 * (grounded in the current standings, refreshed as results come in); otherwise
 * the engine's position-tiered reason is the fallback. Only real roster members
 * are eligible for a model/override line — a newcomer with no roster entry gets
 * the engine's reason rather than the "snacks only" placeholder.
 */
function sentenceFor(r: PlayerOdds, jabFor: (name: string) => string): string {
  const staticJab = rosterFor(r.name)?.jab
  if (!staticJab) return r.reason
  const jab = jabFor(r.name)
  if (jab && jab !== staticJab) return jab
  return r.reason
}

/** index → 0..1 (best first). Unranked names get 1 (worst). */
function normalizePosition(idx: number, n: number): number {
  if (idx === -1) return 1
  return idx / (n - 1 || 1)
}
