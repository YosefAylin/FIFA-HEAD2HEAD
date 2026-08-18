import { fetchPlayers } from '@/lib/supabase/players'
import { fetchMatches } from '@/lib/supabase/matches'
import {
  computeHeadToHead,
  computePlayerStats,
  type PlayerStats,
} from '@/lib/supabase/stats'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'

/**
 * Build the compact, grounded "digest" the bot answers from — the layer that
 * keeps replies accurate instead of hallucinated. Runs once per cron tick.
 *
 * Pure data builder: fetches players + matches in parallel, derives per-player
 * all-time and current-week stats via the same `computePlayerStats` the UI
 * uses, and adds current-week head-to-head floor. No LLM calls here.
 */
export async function buildBotDigest(): Promise<string> {
  const [players, matches] = await Promise.all([fetchPlayers(), fetchMatches()])
  const weekKey = getCurrentWeekKey()

  const allStats = new Map<string, PlayerStats>(
    players.map((p) => [p.id, computePlayerStats(matches, p.id)])
  )
  const weekMatches = matches.filter((m) => m.week_start_date === weekKey)
  const weekStats = new Map<string, PlayerStats>(
    players.map((p) => [p.id, computePlayerStats(weekMatches, p.id)])
  )

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '?'
  const lines: string[] = []

  // All-time top 5 by (points, GD, GF) — mirrors the board the UI shows.
  const top5 = [...allStats.values()]
    .filter((s) => s.matches > 0)
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    .slice(0, 5)
  if (top5.length) {
    lines.push('טבלת כל הזמנים (טופ 5):')
    top5.forEach((s, i) => {
      lines.push(
        `${i + 1}. ${nameOf(s.playerId)} — ${s.points} נק', ${s.wins}-${s.draws}-${s.losses} (נ-ת-ה), ${s.goalsFor} שערים, ${s.goalDifference >= 0 ? '+' : ''}${s.goalDifference}`
      )
    })
  }

  // Per-player one-liners (all-time) for every player.
  lines.push('נתוני שחקנים (כל הזמנים):')
  players.forEach((p) => {
    const s = allStats.get(p.id)
    if (!s || s.matches === 0) {
      lines.push(`${p.name}: עדיין אין משחקים`)
      return
    }
    const form = s.form || '-'
    const streak = s.currentStreak ? `רצף ${s.currentStreak}` : ''
    const drought = s.currentGoalDrought > 0 ? `, בלי גול ${s.currentGoalDrought} משחקים` : ''
    lines.push(
      `${p.name}: ${s.matches} משחקים, ${s.wins}-${s.draws}-${s.losses}, ${s.goalsFor} שערים/${s.goalsAgainst} ספיגות, ${s.points} נק', פורם ${form}${streak ? `, ${streak}` : ''}${drought}`
    )
  })

  // Current-week standings (players with a match this week).
  const weekRows = [...weekStats.values()].filter((s) => s.matches > 0).sort(
    (a, b) => b.points - a.points || b.goalDifference - a.goalDifference
  )
  if (weekRows.length) {
    lines.push('השבוע הנוכחי:')
    weekRows.forEach((s, i) => {
      lines.push(`${i + 1}. ${nameOf(s.playerId)} — ${s.points} נק', ${s.goalsFor} שערים, ${s.wins}-${s.losses}`)
    })
  } else {
    lines.push('השבוע עוד לא נרשמו משחקים.')
  }

  // Current-week head-to-head: biggest pair by combined points among this week's players.
  if (weekRows.length >= 2) {
    let best: { a: string; b: string; total: number } | null = null
    for (let i = 0; i < weekRows.length; i++) {
      for (let j = i + 1; j < weekRows.length; j++) {
        const total = weekRows[i].points + weekRows[j].points
        if (!best || total > best.total) best = { a: weekRows[i].playerId, b: weekRows[j].playerId, total }
      }
    }
    if (best && best.a !== best.b) {
      const h2h = computeHeadToHead(weekMatches, best.a, best.b)
      if (h2h.meetings > 0) {
        lines.push(
          `מפגשים ישירים השבוע: ${nameOf(best.a)} נגד ${nameOf(best.b)} — ${h2h.meetings} משחקים, ${h2h.aWins}-${h2h.bWins}${h2h.draws ? `, ${h2h.draws} תיקו` : ''}, שערים ${h2h.aGoals}-${h2h.bGoals}`
        )
      }
    }
  }

  return lines.join('\n')
}