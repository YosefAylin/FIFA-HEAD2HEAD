import { describe, expect, it } from 'vitest'
import { groupStandingsRows } from './standings'
import type { StandingsRow } from '@/lib/types/database'

function row(over: Partial<StandingsRow> = {}): StandingsRow {
  return {
    player_id: 'a',
    player_name: 'יוסף',
    profile_picture_url: null,
    week_start_date: '2026-08-15',
    matches_played: 4,
    wins: 2,
    draws: 0,
    losses: 2,
    goals_for: 6,
    goals_against: 6,
    win_percentage: 50,
    goal_difference: 0,
    points: 6,
    ...over,
  }
}

describe('groupStandingsRows', () => {
  it('buckets rows with an identical tie key (points/losses/win%/goal diff)', () => {
    const rows = [
      row({ player_id: 'a', points: 9, losses: 1, win_percentage: 80, goal_difference: 5 }),
      row({ player_id: 'b', points: 9, losses: 1, win_percentage: 80, goal_difference: 5 }),
      row({ player_id: 'c', points: 9, losses: 2, win_percentage: 70, goal_difference: 5 }),
      row({ player_id: 'd', points: 6, losses: 1, win_percentage: 80, goal_difference: -2 }),
    ]
    const groups = groupStandingsRows(rows)
    expect(groups).toHaveLength(3)
    expect(groups[0].primary.player_id).toBe('a')
    expect(groups[0].tied.map((t) => t.player_id)).toEqual(['b'])
    expect(groups[1].primary.player_id).toBe('c')
    expect(groups[1].tied).toEqual([])
    expect(groups[2].primary.player_id).toBe('d')
  })

  it('keeps a single row as its own group with no ties', () => {
    const groups = groupStandingsRows([row()])
    expect(groups).toHaveLength(1)
    expect(groups[0].tied).toEqual([])
  })

  it('builds a 3-way tie group', () => {
    const rows = [
      row({ player_id: 'a', points: 6 }),
      row({ player_id: 'b', points: 6 }),
      row({ player_id: 'c', points: 6 }),
    ]
    const [only] = groupStandingsRows(rows)
    expect(only.tied.map((t) => t.player_id)).toEqual(['b', 'c'])
  })
})