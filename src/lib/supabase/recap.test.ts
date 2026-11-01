import { describe, expect, it } from 'vitest'
import {
  computeWeekRecap,
  buildRecapShareText,
  computeWeeklyAwards,
  mostRoundWins,
  mostTechnicalWins,
} from './recap'
import { computeCareerRecords } from './stats'
import type { Match, Player } from '@/lib/types/database'

const WK = '2026-08-15'

function player(id: string, name: string): Player {
  return { id, name, profile_picture_url: null, created_at: `${WK}T00:00:00Z` }
}

function match(
  id: string,
  home: string,
  away: string,
  hs: number,
  as: number,
  week = WK
): Match {
  return {
    id,
    game_mode: '1v1',
    home_player_1_id: home,
    home_player_2_id: null,
    home_score: hs,
    home_team_name: null,
    away_player_1_id: away,
    away_player_2_id: null,
    away_score: as,
    away_team_name: null,
    week_start_date: week,
    created_at: `${week}T10:00:00Z`,
    deleted_at: null,
  }
}

const a = player('a', 'יוסף')
const b = player('b', 'ספי')
const c = player('c', 'אשגרה')
const players = [a, b, c]

describe('computeWeekRecap', () => {
  it('returns null-safe records when no matches exist', () => {
    const recap = computeWeekRecap([], players, WK)
    expect(recap.matchesCount).toBe(0)
    expect(recap.champion).toBeNull()
    expect(recap.loser).toBeNull()
    expect(recap.technicalWin).toBeNull()
    expect(recap.mostTechnical).toBeNull()
    expect(recap.mostRounds).toBeNull()
    expect(recap.totalGoals).toBe(0)
  })

  it('picks the loser of the week by most losses, tie-break fewest goals', () => {
    const matches = [
      match('m1', 'a', 'b', 1, 2), // אשגרה? no — א׳ loses, ב׳ wins
      match('m2', 'a', 'c', 0, 1), // א׳ loses again → 2 losses, 1 goal
      match('m3', 'c', 'b', 2, 1), // c wins
    ]
    const recap = computeWeekRecap(matches, players, WK)
    expect(recap.loser?.name).toBe('יוסף') // 2 losses
    expect(recap.loser?.losses).toBe(2)
    expect(recap.loser?.goalsFor).toBe(1)
  })

  it('picks the week champion by points and biggest win', () => {
    const matches = [
      match('m1', 'a', 'b', 3, 1), // יוסף wins, +3pts
      match('m2', 'b', 'c', 2, 2), // ספי draws, +1pt — 2 goals
      match('m3', 'c', 'a', 0, 5), // אשגרה loses; יוסף +5 goals, biggest win margin 5
    ]
    const recap = computeWeekRecap(matches, players, WK)
    expect(recap.matchesCount).toBe(3)
    expect(recap.totalGoals).toBe(13)
    expect(recap.champion?.name).toBe('יוסף')
    expect(recap.champion?.points).toBe(6)
    expect(recap.technicalWin?.winnerName).toBe('יוסף')
    expect(recap.technicalWin?.margin).toBe(5)
    expect(recap.technicalWin?.label).toContain('0 - 5')
  })

  it('ignores deleted matches', () => {
    const deleted = { ...match('mx', 'a', 'b', 9, 0), deleted_at: `${WK}T12:00:00Z` }
    const recap = computeWeekRecap([deleted], players, WK)
    expect(recap.matchesCount).toBe(0)
    expect(recap.champion).toBeNull()
  })

  it('tracks the longest streak of the day and the still-active streak', () => {
    const matches = [
      match('m1', 'a', 'b', 1, 0),
      match('m2', 'a', 'c', 1, 0),
      match('m3', 'a', 'b', 1, 0), // יוסף: 3 wins in a row
      match('m4', 'c', 'a', 1, 0), // ...then loses, ending the run
      match('m5', 'b', 'c', 1, 0),
      match('m6', 'b', 'c', 1, 0), // ספי: still on a 2-win run
    ]
    const recap = computeWeekRecap(matches, players, WK, WK)
    expect(recap.longestStreak?.name).toBe('יוסף')
    expect(recap.longestStreak?.length).toBe(3)
    expect(recap.activeStreak?.name).toBe('ספי')
    expect(recap.activeStreak?.length).toBe(2)
  })

  it('marks a 3+ goal win as technical and a full sweep as a round win', () => {
    const matches = [
      match('m1', 'a', 'b', 3, 0),
      match('m2', 'a', 'c', 4, 1),
      match('m3', 'b', 'c', 2, 0),
    ]
    const recap = computeWeekRecap(matches, players, WK)
    expect(recap.technicalWin?.winnerName).toBe('יוסף')
    expect(recap.technicalWin?.margin).toBe(3)
    expect(recap.mostTechnical?.name).toBe('יוסף')
    expect(recap.mostTechnical?.count).toBe(2)
    expect(recap.mostRounds?.name).toBe('יוסף')
    expect(recap.mostRounds?.count).toBe(1)
  })

  it('ignores wins by fewer than 3 goals for the technical win', () => {
    const recap = computeWeekRecap([match('m1', 'a', 'b', 2, 1)], players, WK)
    expect(recap.technicalWin).toBeNull()
  })

  it('scopes the loser to the day instead of the whole week', () => {
    const matches = [
      match('m1', 'b', 'a', 1, 0), // day WK: יוסף loses
      match('m2', 'b', 'a', 1, 0),
      match('m3', 'b', 'a', 1, 0), // ...3 week losses
      { ...match('m4', 'c', 'b', 1, 0), created_at: `${WK}T23:30:00Z` }, // next day: ספי loses
      { ...match('m5', 'c', 'b', 1, 0), created_at: `${WK}T23:45:00Z` },
    ]
    const week = computeWeekRecap(matches, players, WK)
    expect(week.loser?.name).toBe('יוסף')
    expect(week.loser?.losses).toBe(3)

    const day = computeWeekRecap(matches, players, WK, '2026-08-16')
    expect(day.loser?.name).toBe('ספי')
    expect(day.loser?.losses).toBe(2)
  })

  it('scopes streaks to the day when a day key is passed', () => {
    const matches = [
      match('m1', 'a', 'b', 1, 0),
      match('m2', 'a', 'b', 1, 0),
      { ...match('m3', 'a', 'b', 1, 0), created_at: `${WK}T23:30:00Z` }, // next tournament day
    ]
    const dayRecap = computeWeekRecap(matches, players, WK, WK)
    expect(dayRecap.longestStreak?.length).toBe(2)
  })
})

describe('achievement leaders', () => {
  it('counts technical wins across tournament days', () => {
    const matches = [
      match('m1', 'a', 'b', 3, 0),
      { ...match('m2', 'a', 'c', 4, 1), created_at: `${WK}T23:00:00Z` },
      match('m3', 'b', 'c', 2, 1),
    ]
    const leader = mostTechnicalWins(matches, players)
    expect(leader?.name).toBe('יוסף')
    expect(leader?.count).toBe(2)
  })

  it('counts full round sweeps across tournament days', () => {
    const matches = [
      match('m1', 'a', 'b', 1, 0),
      match('m2', 'a', 'c', 1, 0),
      match('m3', 'b', 'c', 1, 0), // completes day 1
      { ...match('m4', 'a', 'b', 1, 0), created_at: `${WK}T23:00:00Z` },
      { ...match('m5', 'a', 'c', 1, 0), created_at: `${WK}T23:05:00Z` },
      { ...match('m6', 'b', 'c', 1, 0), created_at: `${WK}T23:10:00Z` }, // completes day 2
    ]
    const leader = mostRoundWins(matches, players)
    expect(leader?.name).toBe('יוסף')
    expect(leader?.count).toBe(2)
  })

  it('counts each swept round, ignoring an incomplete final round', () => {
    const roster = [player('a', 'יוסף'), player('b', 'ספי'), player('c', 'אשגרה'), player('d', 'ליאור')]
    const pairs: [string, string][] = [
      ['a', 'b'],
      ['a', 'c'],
      ['a', 'd'],
      ['b', 'c'],
      ['b', 'd'],
      ['c', 'd'],
    ]
    const at = (min: number) => `${WK}T${String(10 + Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00Z`
    const round = (prefix: string, offset: number) =>
      pairs.map(([home, away], i) => ({
        ...match(`${prefix}-${i}`, home, away, home === 'a' ? 3 : 1, home === 'a' ? 0 : 1),
        created_at: at(offset + i),
      }))
    const matches = [
      ...round('r1', 0),
      ...round('r2', 10),
      ...round('r3', 20).slice(0, 2), // partial tail — must not count
    ]
    const leader = mostRoundWins(matches, roster)
    expect(leader?.name).toBe('יוסף')
    expect(leader?.count).toBe(2)
  })
})

describe('computeWeeklyAwards', () => {
  it('picks the best win ratio and the surprise (biggest jump over the pecking order)', () => {
    // אשגרה (c) is frozen 3rd; יוסף (a) is frozen 1st. c wins both → surprise.
    const matches = [
      match('m1', 'c', 'a', 2, 0),
      match('m2', 'c', 'a', 1, 0),
    ]
    const awards = computeWeeklyAwards(matches, players, WK)
    expect(awards.bestRatio?.name).toBe('אשגרה')
    expect(Math.round(awards.bestRatio?.winPercentage ?? 0)).toBe(100)
    expect(awards.surprise?.name).toBe('אשגרה')
    expect(awards.surprise?.actual).toBe(1)
    expect(awards.surprise?.expected).toBe(3)
  })

  it('returns null awards for a week with no matches', () => {
    const awards = computeWeeklyAwards([], players, WK)
    expect(awards.bestRatio).toBeNull()
    expect(awards.surprise).toBeNull()
  })
})

describe('buildRecapShareText', () => {  it('builds a multiline Hebrew block and degrades on an empty week', () => {
    const full = computeWeekRecap([match('m1', 'a', 'b', 3, 1)], players, WK)
    const text = buildRecapShareText(full)
    expect(text).toContain('סיכום הקובה')
    expect(text).toContain('אלוף השבוע')
    expect(text).toContain('יוסף')
    expect(text).toContain('קורבן השבוע')
    expect(text).toContain('ספי')

    const empty = buildRecapShareText(computeWeekRecap([], players, WK))
    expect(empty).toContain('עוד לא שיחקו')
  })
})

describe('computeCareerRecords', () => {
  it('computes the current win streak and the all-time champion', () => {
    const matches = [
      match('m1', 'a', 'b', 2, 1, '2026-08-01'),
      match('m2', 'a', 'b', 3, 0, '2026-08-08'),
      match('m3', 'a', 'c', 4, 0, '2026-08-15'),
      match('m4', 'b', 'c', 2, 2, '2026-08-15'),
    ]
    const records = computeCareerRecords(matches, players)
    // יוסף: 3 wins, 9 pts — champion
    expect(records.overallChampion?.name).toBe('יוסף')
    expect(records.overallChampion?.points).toBe(9)
    // 3 active consecutive wins (W-W-W)
    expect(records.currentWinStreak?.name).toBe('יוסף')
    expect(records.currentWinStreak?.length).toBe(3)
    // Best win ratio all-time (min 3 games).
    expect(records.bestRatio?.name).toBe('יוסף')
    expect(Math.round(records.bestRatio?.winPercentage ?? 0)).toBe(100)
  })

  it('computes the loser-based records (most losses, loss streaks, most conceded)', () => {
    const matches = [
      match('m1', 'a', 'b', 1, 2, '2026-08-01'), // a loses
      match('m2', 'a', 'b', 1, 2, '2026-08-08'), // a loses again → a 2-loss streak, b wins
      match('m3', 'a', 'c', 0, 1, '2026-08-15'), // a loses 3rd → 3-loss + 3-winless; also most losses (3)
      match('m4', 'c', 'b', 0, 0, '2026-08-15'), // draw
    ]
    const records = computeCareerRecords(matches, players)
    // a (יוסף) lost all 3 → most losses 3
    expect(records.mostLosses?.name).toBe('יוסף')
    expect(records.mostLosses?.losses).toBe(3)
    // 3 consecutive losses
    expect(records.longestLossStreak?.name).toBe('יוסף')
    expect(records.longestLossStreak?.length).toBe(3)
    // a never won → winless streak spans all 3
    expect(records.longestWinlessStreak?.name).toBe('יוסף')
    expect(records.longestWinlessStreak?.length).toBe(3)
  })

  it('picks the player with the most losses, not just the first with one', () => {
    const matches = [
      match('m1', 'c', 'b', 1, 0),
      match('m2', 'c', 'b', 1, 0),
      match('m3', 'c', 'b', 1, 0), // ספי: 3 losses
      match('m4', 'c', 'a', 1, 0), // יוסף: 1 loss
    ]
    const records = computeCareerRecords(matches, players)
    expect(records.mostLosses?.name).toBe('ספי')
    expect(records.mostLosses?.losses).toBe(3)
  })

  it('returns null records before any matches', () => {
    const records = computeCareerRecords([], players)
    expect(records.overallChampion).toBeNull()
    expect(records.currentWinStreak).toBeNull()
    expect(records.bestRatio).toBeNull()
    expect(records.mostLosses).toBeNull()
    expect(records.longestLossStreak).toBeNull()
    expect(records.longestWinlessStreak).toBeNull()
  })
})