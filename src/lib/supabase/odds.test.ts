import { describe, expect, it } from 'vitest'
import { computePlayerOdds, computePlayerOddsAll, nudgePowerPositions, recentFormScore } from './odds'
import type { PlayerStats } from './stats'

const base: PlayerStats = {
  playerId: 'x',
  matches: 4,
  wins: 1,
  draws: 0,
  losses: 3,
  goalsFor: 3,
  goalsAgainst: 7,
  goalDifference: -4,
  points: 3,
  winPercentage: 25,
  currentStreak: 'L',
  currentGoalDrought: 2,
  form: 'LWLL',
}

/** Clone with overrides (keeps tests terse). */
function stats(over: Partial<PlayerStats> = {}): PlayerStats {
  return { ...base, ...over }
}

describe('recentFormScore', () => {
  it('scores W=0, D=0.5, L=1', () => {
    expect(recentFormScore('WWW')).toBe(0)
    expect(recentFormScore('LLL')).toBe(1)
    expect(recentFormScore('WDL')).toBeCloseTo(0.5)
  })
})

describe('computePlayerOdds', () => {
  it('a strong (0 powerPos) player gets a low whisky chance', () => {
    const r = computePlayerOdds({
      id: 'a', name: 'יוסף', photo: null,
      season: stats({ matches: 2, wins: 2, losses: 0, form: 'WW', winPercentage: 100, points: 6 }),
      history: stats({ matches: 10, wins: 8, losses: 1, form: 'WWWWW', winPercentage: 80, points: 24 }),
      powerPos: 0,
      tournamentOpen: true,
    })
    expect(r.whisky).toBeLessThan(30)
    expect(r.lose).toBeLessThan(40)
  })

  it('the bottom of the power rank gets a high whisky chance', () => {
    const r = computePlayerOdds({
      id: 'b', name: 'ספי', photo: null,
      season: stats({ matches: 2, wins: 0, losses: 2, form: 'LL', winPercentage: 0, points: 0 }),
      history: stats({ matches: 10, wins: 2, losses: 7, form: 'LLLW', winPercentage: 20, points: 6 }),
      powerPos: 1,
      tournamentOpen: true,
    })
    expect(r.whisky).toBeGreaterThan(50)
  })

  it('weights the current week heavily when the tournament is open', () => {
    const weakWeek = stats({ matches: 1, wins: 0, losses: 1, form: 'L', winPercentage: 0, points: 0 })
    const strongHistory = stats({ matches: 20, wins: 16, losses: 2, form: 'WWWWW', winPercentage: 80, points: 48 })
    const open = computePlayerOdds({ id: 'a', name: 'יוסף', photo: null, season: weakWeek, history: strongHistory, powerPos: 0.1, tournamentOpen: true })
    const closed = computePlayerOdds({ id: 'a', name: 'יוסף', photo: null, season: weakWeek, history: strongHistory, powerPos: 0.1, tournamentOpen: false })
    // Open → the one bad week raises lose odds more than closed does.
    expect(open.lose).toBeGreaterThan(closed.lose)
  })

  it('an unranked player (powerPos=1) is treated as likely to buy', () => {
    const r = computePlayerOdds({
      id: 'z', name: 'חדש', photo: null,
      season: stats({ matches: 0, form: '' }),
      history: stats({ matches: 1, wins: 0, losses: 1, form: 'L', winPercentage: 0 }),
      powerPos: 1,
      tournamentOpen: true,
    })
    expect(r.whisky).toBeGreaterThan(50)
  })
})

describe('nudgePowerPositions', () => {
  it('a frozen-top player having a bad current season is nudged to the back', () => {
    const inputs = [
      { id: 'a', name: 'יוסף', photo: null, season: stats({ matches: 2, wins: 0, losses: 2, form: 'LL', points: 0, winPercentage: 0 }), history: stats(), powerPos: 0, tournamentOpen: true },
      { id: 'b', name: 'ספי', photo: null, season: stats({ matches: 2, wins: 2, losses: 0, form: 'WW', points: 6, winPercentage: 100 }), history: stats(), powerPos: 1, tournamentOpen: true },
    ]
    const pos = nudgePowerPositions(inputs)
    // The frozen-top player (frozen 0) now ranks behind the hot one.
    expect(pos).toEqual([1, 0])
  })

  it('keeps the frozen order as a tiebreak for equally hot players', () => {
    const inputs = [
      { id: 'a', name: 'יוסף', photo: null, season: stats({ matches: 1, wins: 1, points: 3 }), history: stats(), powerPos: 0, tournamentOpen: true },
      { id: 'b', name: 'ספי', photo: null, season: stats({ matches: 1, wins: 1, points: 3 }), history: stats(), powerPos: 1, tournamentOpen: true },
    ]
    expect(nudgePowerPositions(inputs)).toEqual([0, 1])
  })
})

describe('computePlayerOddsAll', () => {
  it('sorts worst (most likely to buy) first', () => {
    const rows = computePlayerOddsAll([
      { id: 'a', name: 'יוסף', photo: null, season: stats(), history: stats({ wins: 8, losses: 1, form: 'WWW' }), powerPos: 0, tournamentOpen: true },
      { id: 'b', name: 'ספי', photo: null, season: stats({ losses: 3 }), history: stats({ wins: 1, losses: 8, form: 'LLL' }), powerPos: 1, tournamentOpen: true },
    ])
    expect(rows[0].name).toBe('ספי')
    expect(rows[0].whisky).toBeGreaterThan(rows[1].whisky)
  })
})