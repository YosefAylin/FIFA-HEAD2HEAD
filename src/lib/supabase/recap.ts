import { bestTies, computePlayerStats } from '@/lib/supabase/stats'
import { rosterFor } from '@/lib/data/roster'
import { formatWeekKey } from '@/lib/utils/dateHelpers'
import type { Match, Player } from '@/lib/types/database'

export interface RecapMatchRecord {
  id: string
  /** Display "home vs away" label, e.g. "יוסף 3 - 2 ספי". */
  label: string
  margin: number
  winnerName: string
}

export interface WeekRecap {
  weekKey: string
  weekLabel: string
  champion: { name: string; nickname: string | null; points: number; tie?: string[] } | null
  /** The week's worst — most losses, tie-break fewest goals. */
  loser: { name: string; nickname: string | null; losses: number; goalsFor: number; tie?: string[] } | null
  biggestWin: RecapMatchRecord | null
  hotStreak: { name: string; nickname: string | null; length: number; tie?: string[] } | null
  matchesCount: number
  totalGoals: number
}

/** nickname helper with fallback. */
function nick(name: string): string | null {
  return rosterFor(name)?.nickname ?? null
}

/** Render a holder plus any tied names as "A = B = C" (or just "A"). */
function displayHolder(name: string, tie?: string[]): string {
  return tie && tie.length ? [name, ...tie].join(' = ') : name
}

/** Build the display label for a single match: "Home 3 - 2 Away". */
function matchLabel(m: Match, players: Player[]): string {
  const byId = new Map(players.map((p) => [p.id, p]))
  const home = byId.get(m.home_player_1_id)?.name ?? '?'
  const away = byId.get(m.away_player_1_id)?.name ?? '?'
  return `${home} ${m.home_score} - ${m.away_score} ${away}`
}

/**
 * All the teasing facts about a single week, derived purely from the
 * match + player data. Returns null-safe records so the card can degrade
 * gracefully when (e.g.) no matches happened that week.
 */
export function computeWeekRecap(
  matches: Match[],
  players: Player[],
  weekKey: string
): WeekRecap {
  const weekMatches = matches.filter((m) => m.week_start_date === weekKey && !m.deleted_at)

  const weekStats = players.map((p) => ({ p, s: computePlayerStats(weekMatches, p.id) }))

  // Champion: most points in the week, tiebreak by goal difference.
  const champCands = weekStats
    .filter((r) => r.s.matches > 0)
    .sort((a, b) => b.s.points - a.s.points || b.s.goalDifference - a.s.goalDifference)
  const champTie = bestTies(champCands.map((r) => ({ name: r.p.name, value: r.s.points })))
  const championRow = champCands[0]
  const champion = championRow
    ? { name: championRow.p.name, nickname: nick(championRow.p.name), points: championRow.s.points, tie: champTie?.tie }
    : null

  // Loser of the week: mirror of the champion — most losses, tie-break fewest
  // goals (the harshest possible reading of a bad week).
  const loserCands = weekStats
    .filter((r) => r.s.matches > 0 && r.s.losses > 0)
    .sort((a, b) => b.s.losses - a.s.losses || a.s.goalsFor - b.s.goalsFor)
  const loserTie = bestTies(loserCands.map((r) => ({ name: r.p.name, value: r.s.losses })))
  const loserRow = loserCands[0]
  const loser = loserRow
    ? {
        name: loserRow.p.name,
        nickname: nick(loserRow.p.name),
        losses: loserRow.s.losses,
        goalsFor: loserRow.s.goalsFor,
        tie: loserTie?.tie,
      }
    : null

  // Biggest single win (largest goal margin) this week.
  const sorted = [...weekMatches].sort(
    (a, b) => Math.abs(b.home_score - b.away_score) - Math.abs(a.home_score - a.away_score)
  )
  const biggestMatch = sorted[0]
  const biggestWin = biggestMatch
    ? (() => {
        const margin = Math.abs(biggestMatch.home_score - biggestMatch.away_score)
        const homeWins = biggestMatch.home_score > biggestMatch.away_score
        const winnerId = homeWins ? biggestMatch.home_player_1_id : biggestMatch.away_player_1_id
        const winnerName = players.find((p) => p.id === winnerId)?.name ?? '?'
        return {
          id: biggestMatch.id,
          label: matchLabel(biggestMatch, players),
          margin,
          winnerName,
        }
      })()
    : null

  // Longest winning streak (rounded to this week's winners).
  const streakCands = weekStats
    .filter((r) => r.s.currentStreak.startsWith('W'))
    .sort((a, b) => b.s.currentStreak.length - a.s.currentStreak.length)
  const streakTie = bestTies(streakCands.map((r) => ({ name: r.p.name, value: r.s.currentStreak.length })))
  const streakRow = streakCands[0]
  const hotStreak = streakRow
    ? {
        name: streakRow.p.name,
        nickname: nick(streakRow.p.name),
        length: streakRow.s.currentStreak.length,
        tie: streakTie?.tie,
      }
    : null

  const totalGoals = weekMatches.reduce((s, m) => s + m.home_score + m.away_score, 0)

  return {
    weekKey,
    weekLabel: formatWeekKey(weekKey),
    champion,
    loser,
    biggestWin,
    hotStreak,
    matchesCount: weekMatches.length,
    totalGoals,
  }
}

/**
 * A short, pastable Hebrew summary built from the recap — designed to be
 * dropped straight into the group WhatsApp chat.
 */
export function buildRecapShareText(recap: WeekRecap): string {
  const lines: string[] = [`סיכום הקובה — ${recap.weekLabel} 🏆`]

  if (recap.champion) {
    lines.push(
      `אלוף השבוע: ${displayHolder(recap.champion.name, recap.champion.tie)}${recap.champion.nickname ? ` (${recap.champion.nickname})` : ''} עם ${recap.champion.points} נק׳`
    )
  }
  if (recap.loser && recap.loser.losses > 0) {
    lines.push(
      `קורבן השבוע: ${displayHolder(recap.loser.name, recap.loser.tie)}${recap.loser.nickname ? ` (${recap.loser.nickname})` : ''} עם ${recap.loser.losses} הפסדים 😅`
    )
  }
  if (recap.biggestWin && recap.biggestWin.margin > 0) {
    lines.push(`הניצחון הכי גדול: ${recap.biggestWin.label} (${recap.biggestWin.margin} שערים)`)
  }
  if (recap.hotStreak && recap.hotStreak.length >= 2) {
    lines.push(`${displayHolder(recap.hotStreak.name, recap.hotStreak.tie)} ברצף של ${recap.hotStreak.length} ניצחונות 🔥`)
  }
  if (recap.matchesCount > 0) {
    lines.push(`סה״כ ${recap.matchesCount} משחקים ו-${recap.totalGoals} שערים השבוע ⚽`)
  }

  if (recap.matchesCount === 0) {
    lines.push('השבוע עוד לא שיחקו — פתחו את הקובה! 😴')
  }

  return lines.join('\n')
}
