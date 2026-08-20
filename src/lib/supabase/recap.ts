import { computePlayerStats } from '@/lib/supabase/stats'
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
  champion: { name: string; nickname: string | null; points: number } | null
  /** The week's worst — most losses, tie-break fewest goals. */
  loser: { name: string; nickname: string | null; losses: number; goalsFor: number } | null
  biggestWin: RecapMatchRecord | null
  topScorer: { name: string; nickname: string | null; goals: number } | null
  /** Player who conceded the most goals this week (defensive sieve). */
  mostGifted: { name: string; nickname: string | null; goalsAgainst: number } | null
  hotStreak: { name: string; nickname: string | null; length: number } | null
  matchesCount: number
  totalGoals: number
}

/** nickname helper with fallback. */
function nick(name: string): string | null {
  return rosterFor(name)?.nickname ?? null
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
  const championRow = weekStats
    .filter((r) => r.s.matches > 0)
    .sort((a, b) => b.s.points - a.s.points || b.s.goalDifference - a.s.goalDifference)[0]
  const champion = championRow
    ? { name: championRow.p.name, nickname: nick(championRow.p.name), points: championRow.s.points }
    : null

  // Loser of the week: mirror of the champion — most losses, tie-break fewest
  // goals (the harshest possible reading of a bad week).
  const loserRow = weekStats
    .filter((r) => r.s.matches > 0 && r.s.losses > 0)
    .sort((a, b) => b.s.losses - a.s.losses || a.s.goalsFor - b.s.goalsFor)[0]
  const loser = loserRow
    ? { name: loserRow.p.name, nickname: nick(loserRow.p.name), losses: loserRow.s.losses, goalsFor: loserRow.s.goalsFor }
    : null

  // Most gifted goals: highest goals-against this week (mirror of top scorer).
  const mostGiftedRow = weekStats
    .filter((r) => r.s.goalsAgainst > 0)
    .sort((a, b) => b.s.goalsAgainst - a.s.goalsAgainst)[0]
  const mostGifted = mostGiftedRow
    ? { name: mostGiftedRow.p.name, nickname: nick(mostGiftedRow.p.name), goalsAgainst: mostGiftedRow.s.goalsAgainst }
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

  // Top scorer of the week.
  const topScorerRow = weekStats
    .filter((r) => r.s.goalsFor > 0)
    .sort((a, b) => b.s.goalsFor - a.s.goalsFor)[0]
  const topScorer = topScorerRow
    ? { name: topScorerRow.p.name, nickname: nick(topScorerRow.p.name), goals: topScorerRow.s.goalsFor }
    : null

  // Longest winning streak (rounded to this week's winners).
  const streakRow = weekStats
    .filter((r) => r.s.currentStreak.startsWith('W'))
    .sort((a, b) => b.s.currentStreak.length - a.s.currentStreak.length)[0]
  const hotStreak = streakRow
    ? { name: streakRow.p.name, nickname: nick(streakRow.p.name), length: streakRow.s.currentStreak.length }
    : null

  const totalGoals = weekMatches.reduce((s, m) => s + m.home_score + m.away_score, 0)

  return {
    weekKey,
    weekLabel: formatWeekKey(weekKey),
    champion,
    loser,
    biggestWin,
    topScorer,
    mostGifted,
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
      `אלוף השבוע: ${recap.champion.name}${recap.champion.nickname ? ` (${recap.champion.nickname})` : ''} עם ${recap.champion.points} נק׳`
    )
  }
  if (recap.loser && recap.loser.losses > 0) {
    lines.push(
      `קורבן השבוע: ${recap.loser.name}${recap.loser.nickname ? ` (${recap.loser.nickname})` : ''} עם ${recap.loser.losses} הפסדים 😅`
    )
  }
  if (recap.biggestWin && recap.biggestWin.margin > 0) {
    lines.push(`הניצחון הכי גדול: ${recap.biggestWin.label} (${recap.biggestWin.margin} שערים)`)
  }
  if (recap.topScorer) {
    lines.push(`מלך השערים השבוע: ${recap.topScorer.name} — ${recap.topScorer.goals} שערים`)
  }
  if (recap.mostGifted) {
    lines.push(`השער הכי פתוח: ${recap.mostGifted.name} — ספג ${recap.mostGifted.goalsAgainst} שערים 🥅`)
  }
  if (recap.hotStreak && recap.hotStreak.length >= 2) {
    lines.push(`${recap.hotStreak.name} ברצף של ${recap.hotStreak.length} ניצחונות 🔥`)
  }
  if (recap.matchesCount > 0) {
    lines.push(`סה״כ ${recap.matchesCount} משחקים ו-${recap.totalGoals} שערים השבוע ⚽`)
  }

  if (recap.matchesCount === 0) {
    lines.push('השבוע עוד לא שיחקו — פתחו את הקובה! 😴')
  }

  return lines.join('\n')
}
