import type { Match, Player } from '@/lib/types/database'

export type Result = 'W' | 'D' | 'L'

/** A player's outcome in a single match. */
export interface PlayerOutcome {
  matchId: string
  weekStart: string
  result: Result
  gf: number
  ga: number
  won: boolean
  drew: boolean
  lost: boolean
}

interface Side {
  p1: string | null
  p2: string | null
  score: number
  otherScore: number
}

function sideOf(match: Match, playerId: string): 'home' | 'away' | null {
  const home: Side = { p1: match.home_player_1_id, p2: match.home_player_2_id, score: match.home_score, otherScore: match.away_score }
  const away: Side = { p1: match.away_player_1_id, p2: match.away_player_2_id, score: match.away_score, otherScore: match.home_score }
  if (home.p1 === playerId || home.p2 === playerId) return 'home'
  if (away.p1 === playerId || away.p2 === playerId) return 'away'
  return null
}

function outcomeOf(side: 'home' | 'away', match: Match): PlayerOutcome {
  const homeScore = match.home_score
  const awayScore = match.away_score
  const gf = side === 'home' ? homeScore : awayScore
  const ga = side === 'home' ? awayScore : homeScore
  const won = gf > ga
  const drew = gf === ga
  const lost = gf < ga
  return {
    matchId: match.id,
    weekStart: match.week_start_date,
    result: won ? 'W' : drew ? 'D' : 'L',
    gf,
    ga,
    won,
    drew,
    lost,
  }
}

/** A player's per-match outcomes, oldest first. */
export function outcomesForPlayer(matches: Match[], playerId: string): PlayerOutcome[] {
  return matches
    .filter((m) => sideOf(m, playerId) !== null)
    .map((m) => outcomeOf(sideOf(m, playerId)!, m))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

export interface PlayerStats {
  playerId: string
  matches: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  winPercentage: number
  currentStreak: string // e.g. "WWL"
  currentGoalDrought: number // matches since last goal (0 = scored last match)
  form: string // last up-to-5 results
}

export function computePlayerStats(matches: Match[], playerId: string): PlayerStats {
  const outcomes = outcomesForPlayer(matches, playerId)
  const wins = outcomes.filter((o) => o.won).length
  const draws = outcomes.filter((o) => o.drew).length
  const losses = outcomes.filter((o) => o.lost).length
  const goalsFor = outcomes.reduce((s, o) => s + o.gf, 0)
  const goalsAgainst = outcomes.reduce((s, o) => s + o.ga, 0)
  const points = wins * 3 + draws
  const winPercentage = outcomes.length ? (wins / outcomes.length) * 100 : 0

  // Current streak: walk back from most recent while result repeats.
  const currentStreak = (() => {
    if (!outcomes.length) return ''
    let streak = outcomes[outcomes.length - 1].result
    for (let i = outcomes.length - 2; i >= 0; i--) {
      if (outcomes[i].result === outcomes[outcomes.length - 1].result) streak += outcomes[i].result
      else break
    }
    return streak
  })()

  // Goal drought: count matches since the last one where the player scored.
  const currentGoalDrought = (() => {
    let drought = 0
    for (let i = outcomes.length - 1; i >= 0; i--) {
      if (outcomes[i].gf > 0) break
      drought++
    }
    return drought
  })()

  const form = outcomes
    .slice(-5)
    .map((o) => o.result)
    .join('')

  return {
    playerId,
    matches: outcomes.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    points,
    winPercentage,
    currentStreak,
    currentGoalDrought,
    form,
  }
}

export interface HeadToHead {
  meetings: number
  aWins: number
  bWins: number
  draws: number
  aGoals: number
  bGoals: number
  recent: Match[]
}

/** Head-to-head between two players (they must be on opposite sides). */
export function computeHeadToHead(matches: Match[], playerA: string, playerB: string): HeadToHead {
  const meetings = matches.filter((m) => {
    const sideA = sideOf(m, playerA)
    const sideB = sideOf(m, playerB)
    return sideA !== null && sideB !== null && sideA !== sideB
  })
  let aWins = 0
  let bWins = 0
  let draws = 0
  let aGoals = 0
  let bGoals = 0
  for (const m of meetings) {
    const aSide = sideOf(m, playerA)!
    const aOutcome = outcomeOf(aSide, m)
    if (aOutcome.won) aWins++
    else if (aOutcome.drew) draws++
    else bWins++
    const bSide = sideOf(m, playerB)!
    const bOutcome = outcomeOf(bSide, m)
    aGoals += aOutcome.gf
    bGoals += bOutcome.gf
  }
  return { meetings: meetings.length, aWins, bWins, draws, aGoals, bGoals, recent: meetings.slice(0, 8) }
}

export interface CareerRecords {
  /** Biggest goal-margin win all-time (winner + score line). */
  biggestWin: { id: string; winnerName: string; label: string; margin: number } | null
  /** Longest run of consecutive wins by a single player. */
  longestStreak: { name: string; length: number } | null
  /** Most goals scored by one player within a single week. */
  mostGoalsInWeek: { name: string; goals: number; weekLabel: string } | null
  /** Most appearances all-time. */
  mostMatches: { name: string; matches: number } | null
  /** All-time #1 by points (tiebreak goal difference) — the trophy cabinet. */
  overallChampion: { name: string; points: number; goalDifference: number; matches: number } | null
}

/**
 * All-time career records, derived purely from the match data. Used by the
 * /records trophy cabinet. Records are null-safe so the board can degrade
 * gracefully before any matches exist.
 */
export function computeCareerRecords(matches: Match[], players: Player[]): CareerRecords {
  const byId = new Map(players.map((p) => [p.id, p]))
  const nameOf = (id: string | null) => byId.get(id ?? '')?.name ?? '?'

  const active = matches.filter((m) => !m.deleted_at)

  // Biggest single win (largest goal margin) all-time.
  const sorted = [...active].sort(
    (a, b) => Math.abs(b.home_score - b.away_score) - Math.abs(a.home_score - a.away_score)
  )
  const biggest = sorted[0]
  const biggestWin = biggest
    ? (() => {
        const margin = Math.abs(biggest.home_score - biggest.away_score)
        const homeWins = biggest.home_score > biggest.away_score
        const winnerId = homeWins ? biggest.home_player_1_id : biggest.away_player_1_id
        const winnerName = nameOf(winnerId)
        const label = `${nameOf(biggest.home_player_1_id)} ${biggest.home_score} - ${biggest.away_score} ${nameOf(biggest.away_player_1_id)}`
        return { id: biggest.id, winnerName, label, margin }
      })()
    : null

  // Longest consecutive-win streak per player.
  let longestStreak: CareerRecords['longestStreak'] = null
  for (const p of players) {
    const outcomes = outcomesForPlayer(active, p.id)
    let run = 0
    let best = 0
    for (const o of outcomes) {
      if (o.won) {
        run++
        if (run > best) best = run
      } else {
        run = 0
      }
    }
    if (best > 0 && (!longestStreak || best > longestStreak.length)) {
      longestStreak = { name: p.name, length: best }
    }
  }

  // Most goals by one player within a single week.
  let mostGoalsInWeek: CareerRecords['mostGoalsInWeek'] = null
  for (const p of players) {
    const perWeek = new Map<string, number>()
    for (const m of active) {
      const side = sideOf(m, p.id)
      if (!side) continue
      const gf = side === 'home' ? m.home_score : m.away_score
      perWeek.set(m.week_start_date, (perWeek.get(m.week_start_date) ?? 0) + gf)
    }
    for (const [weekKey, goals] of perWeek) {
      if (!mostGoalsInWeek || goals > mostGoalsInWeek.goals) {
        mostGoalsInWeek = { name: p.name, goals, weekLabel: weekKey }
      }
    }
  }

  // Most appearances all-time.
  let mostMatches: CareerRecords['mostMatches'] = null
  for (const p of players) {
    const count = outcomesForPlayer(active, p.id).length
    if (count > 0 && (!mostMatches || count > mostMatches.matches)) {
      mostMatches = { name: p.name, matches: count }
    }
  }

  // All-time #1 by points, tiebreak goal difference.
  const ranked = players
    .map((p) => ({ p, s: computePlayerStats(active, p.id) }))
    .filter((r) => r.s.matches > 0)
    .sort((a, b) => b.s.points - a.s.points || b.s.goalDifference - a.s.goalDifference)
  const top = ranked[0]
  const overallChampion: CareerRecords['overallChampion'] = top
    ? {
        name: top.p.name,
        points: top.s.points,
        goalDifference: top.s.goalDifference,
        matches: top.s.matches,
      }
    : null

  return { biggestWin, longestStreak, mostGoalsInWeek, mostMatches, overallChampion }
}

export interface FunBadge {
  emoji: string
  title: string
  detail: string
}

const BADGES: Record<string, FunBadge> = {
  king: { emoji: '👑', title: 'מלך הקובה', detail: 'הכי הרבה ניצחונות' },
  goals: { emoji: '🎯', title: 'פצצה', detail: 'הכי הרבה שערים' },
  loser: { emoji: '😅', title: 'קורבן הקובה', detail: 'הכי הרבה הפסדים' },
  draws: { emoji: '🤝', title: 'מלך התיקו', detail: 'הכי הרבה תיקו' },
  hot: { emoji: '🔥', title: 'לוהט', detail: 'רצף ניצחונות פעיל' },
  drought: { emoji: '🥶', title: 'בצורת שערים', detail: 'לא כובש כבר כמה משחקים' },
  goalie: { emoji: '🥅', title: 'שער פתוח', detail: 'הכי הרבה ספיגות' },
  legend: { emoji: '⭐', title: 'אגדה', detail: 'אחוז ניצחונות מרשים' },
  fan: { emoji: '🍿', title: 'חבר של שחקנים', detail: 'מחכה למשחק הבא' },
}

/**
 * Assigns fun/humor badges to every player from live stats.
 * One badge per player, deterministic.
 */
export function assignBadges(
  players: Player[],
  stats: Map<string, PlayerStats>
): Map<string, FunBadge> {
  const result = new Map<string, FunBadge>()

  const top = (pick: (s: PlayerStats) => number, tiebreak: (s: PlayerStats) => number) =>
    [...stats.values()].sort(
      (a, b) => pick(b) - pick(a) || tiebreak(b) - tiebreak(a)
    )[0]

  const mostWins = top((s) => s.wins, (s) => s.points)
  const mostGoals = top((s) => s.goalsFor, (s) => s.wins)
  const mostLosses = top((s) => s.losses, (s) => -s.points)
  const mostDraws = top((s) => s.draws, (s) => s.matches)
  const mostConceded = top((s) => s.goalsAgainst, (s) => -s.points)

  for (const player of players) {
    const s = stats.get(player.id)
    if (!s || s.matches === 0) {
      result.set(player.id, BADGES.fan)
      continue
    }

    if (s.wins > 0 && mostWins && mostWins.playerId === player.id && s.wins === mostWins.wins) {
      result.set(player.id, BADGES.king)
    } else if (s.goalsFor > 0 && mostGoals && mostGoals.playerId === player.id && s.goalsFor === mostGoals.goalsFor) {
      result.set(player.id, BADGES.goals)
    } else if (s.losses > 0 && mostLosses && mostLosses.playerId === player.id && s.losses === mostLosses.losses) {
      result.set(player.id, BADGES.loser)
    } else if (s.draws > 0 && mostDraws && mostDraws.playerId === player.id && s.draws === mostDraws.draws) {
      result.set(player.id, BADGES.draws)
    } else if (s.goalsAgainst > 0 && mostConceded && mostConceded.playerId === player.id && s.goalsAgainst === mostConceded.goalsAgainst) {
      result.set(player.id, BADGES.goalie)
    } else if (s.currentGoalDrought >= 3) {
      result.set(player.id, BADGES.drought)
    } else if (s.currentStreak.startsWith('W') && s.currentStreak.length >= 3) {
      result.set(player.id, BADGES.hot)
    } else if (s.winPercentage >= 60 && s.matches >= 3) {
      result.set(player.id, BADGES.legend)
    } else {
      result.set(player.id, BADGES.fan)
    }
  }
  return result
}

/**
 * Rotating group banter phrases, built from the group own culture
 * (whatsapp-group.txt): the unwritten whiskey rule, and friends
 * nicknames.
 */
export const BANTER_PHRASES = [
  'מישהו ינצח את יוסף מתישהו? או שכולם סבבה עם מקום שני. 😏',
  'ליאור עוד פעם במילואים? המדינה צריכה אותו — השער פחות. 🎖️',
  'אסף עוד פעם בוכה? שיפוט, מזגן, דשא — תמיד יש תירוץ. 😢',
  'מנש מחכה לאישור מהבית — עד אז תמיד "חירום בעבודה". 🏃',
  'זקי מסתובב על הדשא — הסיבוב הכי יפה בליגה, רק בלי שער. 💫',
  'המנכ״ל מחלק הוראות ומסמן ימים — הפועלים על המגרש. 📋',
  'ספי נשמע כבר מהלובי — המשחק עוד לא נפתח. 📣',
  'הקיר שלו חזק — רק השער הזה מתחמק כל שבת. 😎',
  'המילואימניק קובע "צו מעצר" למי שלא מגיע — ואז בעצמו לא מגיע. 🤫',
  'כלל לא כתוב: מי שמפסיד מביא וויסקי. קבלו את הבקבוק. 🥃',
  'גול בלי אישור מהבית? זה לא גול, זה וויסקי למישהו אחר. ⚽',
  'אשגרה המפקד חזר — נותן הוראות, מארגן מנגל, מנהל אופרציה. רק השער שלו עוד בגזרה. 🫡',
  'ליאור חייב וויסקי כבר שנתיים — הבקבוק הזה יותר ותיק מכמה ניצחונות קבע. 🥃',
  'בעל הבית בתאילנד "השאיר הפתעות" — הפועלים נשארו לנקות, הוא נשאר לרחוץ. ✈️',
  'מנש קיבל אישור מהאישה? אחרת זה שוב "בעבודה". 🪢',
  'אין ספק, רק שאלה: מי שזוכר את השער של אסף? גם הוא לא. 😴',
  'אבי קובץ את כולם ואת הקופה — רק גול אישי אי אפשר לארגן. 🧭',
  'רשמתם את המשחק? הבוט מרים גבה — וגם בודק איפה האישור. ⚽',
  'המנגל על האש, האישה סגרה עלייך — והפעם אין אישור לצאת. 🍖',
]

