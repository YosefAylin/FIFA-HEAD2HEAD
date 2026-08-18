import { describe, expect, it } from 'vitest'
import { computeWeekRecap, buildRecapShareText } from './recap'
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
    expect(recap.biggestWin).toBeNull()
    expect(recap.topScorer).toBeNull()
    expect(recap.totalGoals).toBe(0)
  })

  it('picks the week champion by points, top scorer and biggest win', () => {
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
    expect(recap.topScorer?.name).toBe('יוסף')
    expect(recap.topScorer?.goals).toBe(8)
    expect(recap.biggestWin?.winnerName).toBe('יוסף')
    expect(recap.biggestWin?.margin).toBe(5)
    expect(recap.biggestWin?.label).toContain('0 - 5')
  })

  it('ignores deleted matches', () => {
    const deleted = { ...match('mx', 'a', 'b', 9, 0), deleted_at: `${WK}T12:00:00Z` }
    const recap = computeWeekRecap([deleted], players, WK)
    expect(recap.matchesCount).toBe(0)
    expect(recap.champion).toBeNull()
  })

  it('finds the hot streak from consecutive wins', () => {
    // יוסף wins both twice in a row; ספי wins once
    const matches = [
      match('m1', 'a', 'b', 1, 0),
      match('m2', 'a', 'b', 1, 0),
      match('m3', 'c', 'b', 1, 0),
    ]
    const recap = computeWeekRecap(matches, players, WK)
    expect(recap.hotStreak?.name).toBe('יוסף')
    expect(recap.hotStreak?.length).toBe(2)
  })
})

describe('buildRecapShareText', () => {
  it('builds a multiline Hebrew block and degrades on an empty week', () => {
    const full = computeWeekRecap([match('m1', 'a', 'b', 3, 1)], players, WK)
    const text = buildRecapShareText(full)
    expect(text).toContain('סיכום הקובה')
    expect(text).toContain('אלוף השבוע')
    expect(text).toContain('יוסף')

    const empty = buildRecapShareText(computeWeekRecap([], players, WK))
    expect(empty).toContain('עוד לא שיחקו')
  })
})

describe('computeCareerRecords', () => {
  it('computes biggest win, longest streak, most goals in a week and champion', () => {
    const matches = [
      match('m1', 'a', 'b', 2, 1, '2026-08-01'),
      match('m2', 'a', 'b', 3, 0, '2026-08-08'),
      match('m3', 'a', 'c', 4, 0, '2026-08-15'),
      match('m4', 'b', 'c', 2, 2, '2026-08-15'),
    ]
    const records = computeCareerRecords(matches, players)
    // יוסף: 3 wins, 9 pts — champion; biggest win 4-0 vs אשגרה
    expect(records.overallChampion?.name).toBe('יוסף')
    expect(records.overallChampion?.points).toBe(9)
    expect(records.biggestWin?.margin).toBe(4)
    expect(records.biggestWin?.label).toContain('4 - 0')
    // 3 consecutive wins (W-W-W)
    expect(records.longestStreak?.name).toBe('יוסף')
    expect(records.longestStreak?.length).toBe(3)
    // 4 goals in the last week
    expect(records.mostGoalsInWeek?.name).toBe('יוסף')
    expect(records.mostGoalsInWeek?.goals).toBe(4)
    // יוסף played 3 of the 4 matches (m4 is ספי vs אשגרה)
    expect(records.mostMatches?.name).toBe('יוסף')
    expect(records.mostMatches?.matches).toBe(3)
  })

  it('returns null records before any matches', () => {
    const records = computeCareerRecords([], players)
    expect(records.overallChampion).toBeNull()
    expect(records.biggestWin).toBeNull()
    expect(records.longestStreak).toBeNull()
  })
})