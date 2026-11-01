import { bestTies, computePlayerStats, outcomesForPlayer } from '@/lib/supabase/stats'
import { POWER_RANK, rosterFor } from '@/lib/data/roster'
import { formatDayKey, formatWeekKey, matchDayKey } from '@/lib/utils/dateHelpers'
import type { Match, Player } from '@/lib/types/database'

export interface RecapMatchRecord {
  id: string
  /** Display "home vs away" label, e.g. "יוסף 3 - 2 ספי". */
  label: string
  margin: number
  winnerName: string
}

export interface StreakRecord {
  name: string
  nickname: string | null
  length: number
  tie?: string[]
}

export interface WeekRecap {
  weekKey: string
  weekLabel: string
  champion: {
    name: string
    nickname: string | null
    points: number
    wins: number
    draws: number
    losses: number
    goalDifference: number
    tie?: string[]
  } | null
  /** The week's worst — most losses, tie-break fewest goals. */
  loser: {
    name: string
    nickname: string | null
    losses: number
    goalsFor: number
    wins: number
    draws: number
    goalDifference: number
    tie?: string[]
  } | null
  /** The biggest win by 3+ goals — the group's "טכני". */
  technicalWin: RecapMatchRecord | null
  /** A player who beat every other participant — a full "סבב". */
  roundWin: { name: string; nickname: string | null; beaten: number; tie?: string[] } | null
  /** Longest run of consecutive wins anywhere in the recapped day/week. */
  longestStreak: StreakRecord | null
  /** The win streak a player is still on right now (trailing run). */
  activeStreak: StreakRecord | null
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
 * All the teasing facts about a single week (or a single tournament day, when
 * `dayKey` is given), derived purely from the match + player data. Returns
 * null-safe records so the card can degrade gracefully when (e.g.) no matches
 * happened in that scope.
 */
export function computeWeekRecap(
  matches: Match[],
  players: Player[],
  weekKey: string,
  /** Optional tournament day: when given, every stat is scoped to that day. */
  dayKey?: string
): WeekRecap {
  const weekMatches = matches.filter((m) => m.week_start_date === weekKey && !m.deleted_at)
  const scopedMatches = dayKey
    ? weekMatches.filter((m) => matchDayKey(m.created_at) === dayKey)
    : weekMatches

  const scopedStats = players.map((p) => ({ p, s: computePlayerStats(scopedMatches, p.id) }))

  // Champion: most points in scope, tiebreak by goal difference.
  const champCands = scopedStats
    .filter((r) => r.s.matches > 0)
    .sort((a, b) => b.s.points - a.s.points || b.s.goalDifference - a.s.goalDifference)
  const champTie = bestTies(champCands.map((r) => ({ name: r.p.name, value: r.s.points })))
  const championRow = champCands[0]
  const champion = championRow
    ? {
        name: championRow.p.name,
        nickname: nick(championRow.p.name),
        points: championRow.s.points,
        wins: championRow.s.wins,
        draws: championRow.s.draws,
        losses: championRow.s.losses,
        goalDifference: championRow.s.goalDifference,
        tie: champTie?.tie,
      }
    : null

  // Loser of the week: mirror of the champion — most losses, tie-break fewest
  // goals (the harshest possible reading of a bad week).
  const loserCands = scopedStats
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
        wins: loserRow.s.wins,
        draws: loserRow.s.draws,
        goalDifference: loserRow.s.goalDifference,
        tie: loserTie?.tie,
      }
    : null

  // "טכני": a win by 3+ goals. The headline one is the widest margin (and, on
  // a tie, the highest-scoring game).
  const technicalMatch = [...scopedMatches]
    .filter((m) => Math.abs(m.home_score - m.away_score) >= 3)
    .sort(
      (a, b) =>
        Math.abs(b.home_score - b.away_score) - Math.abs(a.home_score - a.away_score) ||
        b.home_score + b.away_score - (a.home_score + a.away_score)
    )[0]
  const technicalWin = technicalMatch
    ? (() => {
        const margin = Math.abs(technicalMatch.home_score - technicalMatch.away_score)
        const homeWins = technicalMatch.home_score > technicalMatch.away_score
        const winnerId = homeWins ? technicalMatch.home_player_1_id : technicalMatch.away_player_1_id
        const winnerName = players.find((p) => p.id === winnerId)?.name ?? '?'
        return {
          id: technicalMatch.id,
          label: matchLabel(technicalMatch, players),
          margin,
          winnerName,
        }
      })()
    : null

  // "סבב": a player who beat every other participant in the tournament before a
  // new round begins. Built from the distinct opponents each player beat.
  const participants = new Set<string>()
  const beaten = new Map<string, Set<string>>()
  for (const m of scopedMatches) {
    const homeIds = [m.home_player_1_id, m.home_player_2_id].filter((id): id is string => Boolean(id))
    const awayIds = [m.away_player_1_id, m.away_player_2_id].filter((id): id is string => Boolean(id))
    for (const id of [...homeIds, ...awayIds]) participants.add(id)
    if (m.home_score === m.away_score) continue
    const winners = m.home_score > m.away_score ? homeIds : awayIds
    const losers = m.home_score > m.away_score ? awayIds : homeIds
    for (const id of winners) {
      const set = beaten.get(id) ?? new Set<string>()
      for (const opponent of losers) set.add(opponent)
      beaten.set(id, set)
    }
  }
  const sweepEntries = players
    .map((p) => ({ name: p.name, value: beaten.get(p.id)?.size ?? 0 }))
    .filter((r) => r.value > 0 && r.value >= participants.size - 1)
    .sort((a, b) => b.value - a.value)
  const sweep = sweepEntries.length ? bestTies(sweepEntries) : null
  const roundWin = sweep
    ? { name: sweep.name, nickname: nick(sweep.name), beaten: sweep.value, tie: sweep.tie }
    : null

  // Streaks, scoped to the day when we have one: the longest run of wins
  // anywhere in the session, plus the streak a player is still sitting on.
  const runs = players
    .map((p) => {
      const outcomes = outcomesForPlayer(scopedMatches, p.id)
      let longest = 0
      let run = 0
      for (const o of outcomes) {
        if (o.won) {
          run++
          if (run > longest) longest = run
        } else {
          run = 0
        }
      }
      const s = computePlayerStats(scopedMatches, p.id)
      const active = s.currentStreak.startsWith('W') ? s.currentStreak.length : 0
      return { p, longest, active }
    })
    .filter((r) => r.longest > 0)

  const streakRecord = (
    pick: (r: (typeof runs)[number]) => number,
    min: number
  ): StreakRecord | null => {
    const entries = runs
      .filter((r) => pick(r) >= min)
      .sort((a, b) => pick(b) - pick(a))
      .map((r) => ({ name: r.p.name, value: pick(r) }))
    const top = entries.length ? bestTies(entries) : null
    return top
      ? { name: top.name, nickname: nick(top.name), length: top.value, tie: top.tie }
      : null
  }

  const longestStreak = streakRecord((r) => r.longest, 2)
  const activeStreak = streakRecord((r) => r.active, 2)

  const totalGoals = scopedMatches.reduce((s, m) => s + m.home_score + m.away_score, 0)

  return {
    weekKey,
    weekLabel: dayKey ? formatDayKey(dayKey) : formatWeekKey(weekKey),
    champion,
    loser,
    technicalWin,
    roundWin,
    longestStreak,
    activeStreak,
    matchesCount: scopedMatches.length,
    totalGoals,
  }
}

export interface WeeklyAwards {
  /** Best win ratio this week (min one match), tiebreak points. */
  bestRatio: { name: string; nickname: string | null; winPercentage: number; wins: number; matches: number; tie?: string[] } | null
  /**
   * The week's pleasant surprise: the player who finished highest above their
   * frozen POWER_RANK expectation (biggest positive rank jump).
   */
  surprise: { name: string; nickname: string | null; points: number; expected: number; actual: number } | null
}

/**
 * The lighter weekly awards show alongside the recap: best win ratio and the
 * surprise of the week (who over-performed their pecking order). Pure + null-safe.
 */
export function computeWeeklyAwards(matches: Match[], players: Player[], weekKey: string): WeeklyAwards {
  const weekMatches = matches.filter((m) => m.week_start_date === weekKey && !m.deleted_at)
  const withStats = players
    .map((p) => ({ p, s: computePlayerStats(weekMatches, p.id) }))
    .filter((r) => r.s.matches > 0)

  // Best ratio: highest win%, tiebreak more points, then more wins.
  const ratioCands = withStats
    .slice()
    .sort((a, b) => b.s.winPercentage - a.s.winPercentage || b.s.points - a.s.points)
  const ratioTie = bestTies(ratioCands.map((r) => ({ name: r.p.name, value: r.s.winPercentage })))
  const bestRatioRow = ratioCands[0]
  const bestRatio = bestRatioRow
    ? {
        name: bestRatioRow.p.name,
        nickname: nick(bestRatioRow.p.name),
        winPercentage: bestRatioRow.s.winPercentage,
        wins: bestRatioRow.s.wins,
        matches: bestRatioRow.s.matches,
        tie: ratioTie?.tie,
      }
    : null

  // Surprise: weekly rank vs the frozen power-rank expectation.
  const ranked = withStats
    .slice()
    .sort(
      (a, b) =>
        b.s.points - a.s.points ||
        a.s.losses - b.s.losses ||
        b.s.winPercentage - a.s.winPercentage ||
        b.s.goalDifference - a.s.goalDifference
    )
  const actualById = new Map(ranked.map((r, i) => [r.p.id, i + 1]))
  const expectedRank = (name: string) => {
    const idx = POWER_RANK.indexOf(name)
    return idx === -1 ? ranked.length : idx + 1
  }
  const surprises = withStats
    .map((r) => ({ r, delta: expectedRank(r.p.name) - (actualById.get(r.p.id) ?? ranked.length) }))
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
  const surpriseRow = surprises[0]
  const surprise = surpriseRow
    ? {
        name: surpriseRow.r.p.name,
        nickname: nick(surpriseRow.r.p.name),
        points: surpriseRow.r.s.points,
        expected: expectedRank(surpriseRow.r.p.name),
        actual: actualById.get(surpriseRow.r.p.id) ?? ranked.length,
      }
    : null

  return { bestRatio, surprise }
}

/** The `n` most recent week keys that actually have non-deleted matches. */
export function recentMatchWeeks(matches: Match[], n: number): string[] {
  const keys = [...new Set(matches.filter((m) => !m.deleted_at).map((m) => m.week_start_date))].sort((a, b) =>
    b.localeCompare(a)
  )
  return keys.slice(0, n)
}

/**
 * A short, pastable Hebrew summary built from the recap — designed to be
 * dropped straight into the group WhatsApp chat.
 */export function buildRecapShareText(recap: WeekRecap): string {
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
  if (recap.technicalWin) {
    lines.push(
      `ניצחון טכני: ${recap.technicalWin.label} (הפרש ${recap.technicalWin.margin} שערים) 🎯`
    )
  }
  if (recap.roundWin) {
    lines.push(
      `סבב: ${displayHolder(recap.roundWin.name, recap.roundWin.tie)} ניצח את כל השחקנים 🔁`
    )
  }
  if (recap.longestStreak && recap.longestStreak.length >= 2) {
    lines.push(
      `הרצף הארוך: ${displayHolder(recap.longestStreak.name, recap.longestStreak.tie)} עם ${recap.longestStreak.length} ניצחונות ברצף 🔥`
    )
  }
  if (
    recap.activeStreak &&
    recap.activeStreak.length >= 2 &&
    (recap.activeStreak.name !== recap.longestStreak?.name ||
      recap.activeStreak.length !== recap.longestStreak?.length)
  ) {
    lines.push(`${displayHolder(recap.activeStreak.name, recap.activeStreak.tie)} עדיין ברצף של ${recap.activeStreak.length} ניצחונות ⚡`)
  }
  if (recap.matchesCount > 0) {
    lines.push(`סה״כ ${recap.matchesCount} משחקים ו-${recap.totalGoals} שערים השבוע ⚽`)
  }

  if (recap.matchesCount === 0) {
    lines.push('השבוע עוד לא שיחקו — פתחו את הקובה! 😴')
  }

  return lines.join('\n')
}
