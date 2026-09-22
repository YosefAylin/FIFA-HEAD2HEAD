import { describe, expect, it } from 'vitest'
import { buildPlayerTournamentHistory, groupStandingsRows } from './standings'
import type { Match, Player, StandingsRow } from '@/lib/types/database'

function row(over: Partial<StandingsRow> = {}): StandingsRow {
  return {
    player_id: 'a',
    player_name: 'יוסף',
    profile_picture_url: null,
    day_key: '2026-08-15',
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

function player(over: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'יוסף',
    profile_picture_url: null,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  }
}

function match(over: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    game_mode: '1v1',
    home_player_1_id: 'p1',
    home_player_2_id: null,
    home_score: 3,
    home_team_name: null,
    away_player_1_id: 'p2',
    away_player_2_id: null,
    away_score: 1,
    away_team_name: null,
    week_start_date: '2026-08-15',
    created_at: '2026-08-15T18:00:00Z',
    deleted_at: null,
    ...over,
  }
}

describe('buildPlayerTournamentHistory', () => {
  it('returns one row per played day, newest first, with that day’s stats', () => {
    const matches = [
      match({ id: 'a', home_score: 3, away_score: 1, created_at: '2026-08-15T18:00:00Z' }),
      match({ id: 'b', home_score: 0, away_score: 2, created_at: '2026-08-15T20:00:00Z' }),
      match({ id: 'c', home_score: 1, away_score: 1, created_at: '2026-08-22T18:00:00Z' }),
    ]
    const rows = buildPlayerTournamentHistory(player(), matches)
    expect(rows.map((r) => r.day_key)).toEqual(['2026-08-22', '2026-08-15'])
    expect(rows[0]).toMatchObject({ matches_played: 1, wins: 0, draws: 1, losses: 0, points: 1 })
    expect(rows[1]).toMatchObject({
      matches_played: 2,
      wins: 1,
      draws: 0,
      losses: 1,
      goals_for: 3,
      goals_against: 3,
      goal_difference: 0,
      points: 3,
    })
  })

  it('omits days the player did not play', () => {
    const matches = [
      match({ id: 'a', home_player_1_id: 'p2', created_at: '2026-08-15T18:00:00Z' }),
      match({ id: 'b', created_at: '2026-08-22T18:00:00Z' }),
    ]
    const rows = buildPlayerTournamentHistory(player(), matches)
    expect(rows.map((r) => r.day_key)).toEqual(['2026-08-22'])
  })

  it('returns an empty list for a player with no matches', () => {
    expect(buildPlayerTournamentHistory(player(), [])).toEqual([])
  })
})