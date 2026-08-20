'use client'

import { useMemo } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { computePlayerStats } from '@/lib/supabase/stats'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import { activeFirst } from '@/lib/utils/sortHelpers'
import type { Player } from '@/lib/types/database'

/**
 * A playful but data-grounded "who's buying / who's losing" card for the week.
 *
 * Two odds per player, each 0–100:
 *  - LOSE-ODDS: how likely they are to lose this week — blended from their
 *    all-time loss rate (defensive baseline) and recent form (last-5 results).
 *  - WHISKY-ODDS: how likely they are to be the one buying the whisky — inverse
 *    of all-time points (power ranking) blended with this week's lose-odds, so
 *    the lowest-ranked, worst-form player tops the list.
 *
 * The percentages are a flavor stat, not a real betting line — a lighthearted
 * read of the group's own numbers. Player photo + a one-line reason shown.
 */
interface OddsRow {
  id: string
  name: string
  photo: string | null
  lose: number
  whisky: number
  reason: string
}

/** Recent-form score: 0=steady, higher=bad. W=0, D=0.5, L=1 over last-5. */
function recentFormScore(form: string): number {
  const f = form.slice(-5)
  if (!f.length) return 0
  let score = 0
  for (const r of f) score += r === 'W' ? 0 : r === 'D' ? 0.5 : 1
  return score / f.length
}

export function WeeklyOddsCard() {
  const { players, matches } = useTournamentData()
  const week = getCurrentWeekKey()

  const rows = useMemo<OddsRow[]>(() => {
    const weekStats = new Map(
      players.map((p) => [
        p.id,
        computePlayerStats(matches.filter((m) => m.week_start_date === week && !m.deleted_at), p.id),
      ])
    )
    const allTime = new Map(players.map((p) => [p.id, computePlayerStats(matches, p.id)]))

    const active = players.filter((p) => p.is_active !== false)
    const haveData = active.filter((p) => (allTime.get(p.id)?.matches ?? 0) > 0)

    // Power ranking: all-time points, then fewer losses, then win% (football).
    const ranked = haveData
      .slice()
      .sort(
        (a, b) =>
          activeFirst(a, b) ||
          allTime.get(b.id)!.points - allTime.get(a.id)!.points ||
          allTime.get(a.id)!.losses - allTime.get(b.id)!.losses ||
          allTime.get(b.id)!.winPercentage - allTime.get(a.id)!.winPercentage
      )
    const n = Math.max(1, ranked.length)

    return ranked
      .map((p: Player) => {
        const at = allTime.get(p.id)!
        const wk = weekStats.get(p.id)!
        if (at.matches === 0) return null

        const lossRate = at.losses / at.matches
        const formScore = recentFormScore(at.form)
        // Lose odds: recent form weighted 0.6 × all-time loss-rate 0.4.
        const lose = Math.round(100 * Math.min(1, 0.6 * formScore + 0.4 * lossRate))

        // Power position: 0 = best, 1 = worst (normalized by count).
        const rankIdx = ranked.indexOf(p)
        const powerPos = rankIdx / (n - 1 || 1)
        // Whisky odds: low power → high; losing this week tips it up.
        const whisky = Math.round(100 * Math.min(1, powerPos * 0.7 + (lose / 100) * 0.3))

        const reason =
          powerPos > 0.65
            ? `נמוך בדירוג הכוח — ${at.losses} הפסדים סך הכל, הסיכוי האישי הכי גדול.`
            : powerPos < 0.35
              ? `הכי חזק בטבלת הכול — מעט הפסדים, סיכוי נמוך.`
              : `אמצע הטבלה — סיכוי בינוני.`

        return {
          id: p.id,
          name: p.name,
          photo: p.profile_picture_url,
          lose,
          whisky,
          reason,
        }
      })
      .filter((r): r is OddsRow => r !== null)
      .sort((a, b) => b.whisky - a.whisky)
  }, [players, matches, week])

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
                  <span title="סיכוי להביא וויסקי">🥃 {r.whisky}%</span>
                  <span className="text-destructive" title="סיכוי להפקיד">📉 {r.lose}%</span>
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
