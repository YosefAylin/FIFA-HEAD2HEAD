import { describe, expect, it } from 'vitest'
import { computeCareerRecords, computeFunFacts, outcomesForPlayer } from './stats'
import type { Match, Player } from '@/lib/types/database'

function player(id: string, name: string): Player {
  return { id, name, profile_picture_url: null, created_at: '2026-01-01T00:00:00Z' }
}

const a = player('a', 'יוסף')
const b = player('b', 'ספי')
const c = player('c', 'אשגרה')
const players = [a, b, c]

function match(
  id: string,
  home: string,
  away: string,
  hs: number,
  as: number,
  createdAt: string
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
    week_start_date: createdAt.slice(0, 10),
    created_at: createdAt,
    deleted_at: null,
  }
}

describe('outcomesForPlayer', () => {
  it('orders by full created_at, not the shared week_start_date', () => {
    // Feed arrives newest-first; two matches share a week but differ in time.
    const matches = [
      match('m4', 'a', 'b', 0, 1, '2026-08-15T20:00:00Z'),
      match('m3', 'a', 'b', 2, 0, '2026-08-15T18:00:00Z'),
      match('m2', 'a', 'b', 2, 0, '2026-08-08T20:00:00Z'),
      match('m1', 'a', 'b', 2, 0, '2026-08-08T18:00:00Z'),
    ]
    const outcomes = outcomesForPlayer(matches, 'a')
    expect(outcomes.map((o) => o.result)).toEqual(['W', 'W', 'W', 'L'])
  })

  it('counts a win streak that crosses a week boundary', () => {
    const matches = [
      match('m4', 'a', 'b', 0, 1, '2026-08-15T20:00:00Z'),
      match('m3', 'a', 'b', 2, 0, '2026-08-15T18:00:00Z'),
      match('m2', 'a', 'b', 2, 0, '2026-08-08T20:00:00Z'),
      match('m1', 'a', 'b', 2, 0, '2026-08-08T18:00:00Z'),
    ]
    const records = computeCareerRecords(matches, players)
    expect(records.longestStreak?.name).toBe('יוסף')
    expect(records.longestStreak?.length).toBe(3)
  })
})

describe('computeFunFacts', () => {
  it('picks the top scorer, the sieve, the draw king and the wildest match', () => {
    const matches = [
      match('m1', 'a', 'b', 5, 0, '2026-08-08T18:00:00Z'),
      match('m2', 'b', 'c', 2, 2, '2026-08-08T19:00:00Z'),
      match('m3', 'c', 'a', 0, 1, '2026-08-15T18:00:00Z'),
    ]
    const facts = computeFunFacts(matches, players)
    const titles = facts.map((f) => f.title)
    expect(titles).toContain('מלך השערים')
    expect(titles).toContain('המשחק המטורף')
    const scorer = facts.find((f) => f.title === 'מלך השערים')
    expect(scorer?.holder).toBe('יוסף') // 5 + 1 = 6 goals
    const wild = facts.find((f) => f.title === 'המשחק המטורף')
    expect(wild?.detail).toBe('5 שערים') // 5-0
  })

  it('returns an empty list with no matches', () => {
    expect(computeFunFacts([], players)).toEqual([])
  })
})
