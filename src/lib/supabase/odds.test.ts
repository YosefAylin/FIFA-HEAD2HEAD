import { describe, expect, it } from 'vitest'
import {
  computePlayerOdds,
  computePlayerOddsAll,
  nudgePowerPositions,
  pickReason,
  recentFormScore,
} from './odds'
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

/** A strong all-time history (few losses, good form). */
const strongHistory = stats({ matches: 20, wins: 16, losses: 2, form: 'WWWWW', winPercentage: 80, points: 48 })

describe('recentFormScore', () => {
  it('scores W=0, D=0.5, L=1', () => {
    expect(recentFormScore('WWW')).toBe(0)
    expect(recentFormScore('LLL')).toBe(1)
    expect(recentFormScore('WDL')).toBeCloseTo(0.5)
  })
})

describe('computePlayerOdds', () => {
  it('a strong player (0 powerPos, good week + last week) gets a low odds', () => {
    const r = computePlayerOdds({
      id: 'a', name: 'יוסף', photo: null,
      season: stats({ matches: 2, wins: 2, losses: 0, form: 'WW', winPercentage: 100, points: 6 }),
      previous: stats({ matches: 2, wins: 2, losses: 0, form: 'WW', winPercentage: 100, points: 6 }),
      history: strongHistory,
      powerPos: 0,
      tournamentOpen: true,
    })
    expect(r.odds).toBeLessThan(30)
  })

  it('the bottom of the power rank with a bad week gets a high odds', () => {
    const r = computePlayerOdds({
      id: 'b', name: 'ספי', photo: null,
      season: stats({ matches: 2, wins: 0, losses: 2, form: 'LL', winPercentage: 0, points: 0 }),
      previous: stats({ matches: 2, wins: 0, losses: 2, form: 'LL', winPercentage: 0, points: 0 }),
      history: stats({ matches: 10, wins: 2, losses: 7, form: 'LLLW', winPercentage: 20, points: 6 }),
      powerPos: 1,
      tournamentOpen: true,
    })
    expect(r.odds).toBeGreaterThan(50)
  })

  it('weights the current week heavily when the tournament is open', () => {
    const weakWeek = stats({ matches: 1, wins: 0, losses: 1, form: 'L', winPercentage: 0, points: 0 })
    const goodPrev = stats({ matches: 2, wins: 2, losses: 0, form: 'WW', winPercentage: 100, points: 6 })
    const open = computePlayerOdds({ id: 'a', name: 'יוסף', photo: null, season: weakWeek, previous: goodPrev, history: strongHistory, powerPos: 0.1, tournamentOpen: true })
    const closed = computePlayerOdds({ id: 'a', name: 'יוסף', photo: null, season: weakWeek, previous: goodPrev, history: strongHistory, powerPos: 0.1, tournamentOpen: false })
    // Open → the one bad week raises odds more than closed does.
    expect(open.odds).toBeGreaterThan(closed.odds)
  })

  it('a bad LAST week raises odds despite a strong all-time record', () => {
    const goodWeek = stats({ matches: 2, wins: 2, losses: 0, form: 'WW', winPercentage: 100, points: 6 })
    const badPrev = stats({ matches: 2, wins: 0, losses: 2, form: 'LL', winPercentage: 0, points: 0 })
    const goodPrev = stats({ matches: 2, wins: 2, losses: 0, form: 'WW', winPercentage: 100, points: 6 })
    // Same current week + history + power rank; only last week differs.
    const lostLastWeek = computePlayerOdds({ id: 'a', name: 'יוסף', photo: null, season: goodWeek, previous: badPrev, history: strongHistory, powerPos: 0.4, tournamentOpen: true })
    const wonLastWeek = computePlayerOdds({ id: 'a', name: 'יוסף', photo: null, season: goodWeek, previous: goodPrev, history: strongHistory, powerPos: 0.4, tournamentOpen: true })
    expect(lostLastWeek.odds).toBeGreaterThan(wonLastWeek.odds)
    // And a bad last week still nudges noticeably above 0 for a strong player.
    expect(lostLastWeek.odds).toBeGreaterThan(5)
  })

  it('an unranked player (powerPos=1) is treated as likely to buy', () => {
    const r = computePlayerOdds({
      id: 'z', name: 'חדש', photo: null,
      season: stats({ matches: 0, form: '' }),
      history: stats({ matches: 1, wins: 0, losses: 1, form: 'L', winPercentage: 0 }),
      powerPos: 1,
      tournamentOpen: true,
    })
    expect(r.odds).toBeGreaterThan(50)
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
  it('sorts most likely to lose/buy first', () => {
    const rows = computePlayerOddsAll([
      { id: 'a', name: 'יוסף', photo: null, season: stats(), history: stats({ wins: 8, losses: 1, form: 'WWW' }), powerPos: 0, tournamentOpen: true },
      { id: 'b', name: 'ספי', photo: null, season: stats({ losses: 3 }), history: stats({ wins: 1, losses: 8, form: 'LLL' }), powerPos: 1, tournamentOpen: true },
    ])
    expect(rows[0].name).toBe('ספי')
    expect(rows[0].odds).toBeGreaterThan(rows[1].odds)
  })
})

describe('time remaining factor', () => {
  const weakWeek = () => stats({ matches: 1, wins: 0, losses: 1, form: 'L', winPercentage: 0, points: 0 })
  const goodPrev = () => stats({ matches: 2, wins: 2, losses: 0, form: 'WW', winPercentage: 100, points: 6 })
  const common = {
    id: 'a',
    name: 'יוסף',
    photo: null as string | null,
    season: weakWeek(),
    previous: goodPrev(),
    history: strongHistory,
    powerPos: 0.1,
    tournamentOpen: true,
  }

  it('omitted fraction equals a full session (default 1 → the open weights)', () => {
    expect(computePlayerOdds({ ...common }).odds).toBe(
      computePlayerOdds({ ...common, timeRemainingFraction: 1 }).odds
    )
  })

  it('fraction 0 equals the closed/final value; 0.5 sits strictly between', () => {
    const full = computePlayerOdds({ ...common, timeRemainingFraction: 1 }).odds
    const half = computePlayerOdds({ ...common, timeRemainingFraction: 0.5 }).odds
    const out = computePlayerOdds({ ...common, timeRemainingFraction: 0 }).odds
    const closed = computePlayerOdds({ ...common, tournamentOpen: false }).odds
    expect(out).toBe(closed)
    expect(half).toBeGreaterThan(closed)
    expect(half).toBeLessThan(full)
  })

  it('is ignored when the tournament is closed mid-week', () => {
    const a = computePlayerOdds({ ...common, tournamentOpen: false, timeRemainingFraction: 0 }).odds
    const b = computePlayerOdds({ ...common, tournamentOpen: false, timeRemainingFraction: 1 }).odds
    expect(a).toBe(b)
  })
})

describe('pickReason (position-tiered fallback sentences)', () => {
  it('returns the "locked on history" line once the countdown is low', () => {
    const r = pickReason({ name: 'ספי', powerPos: 0.5, losses: 8, prevLossScore: 0.5, timeRemaining: 0.2 })
    expect(r).toContain('הזמן הולך ואוזל')
  })

  it('picks the bad-week-plus-rank line for a bottom player with a poor last week', () => {
    const r = pickReason({ name: 'ספי', powerPos: 0.8, losses: 8, prevLossScore: 0.8 })
    expect(r).toContain('הסיכוי הכי גדול להביא את הוויסקי')
  })

  it('picks the low-risk line for the group leader', () => {
    const r = pickReason({ name: 'יוסף', powerPos: 0.1, losses: 2, prevLossScore: 0 })
    expect(r).toContain('סיכוי נמוך להפסיד')
  })

  it('fills the {name} and {losses} slots', () => {
    const r = pickReason({ name: 'ספי', powerPos: 0.8, losses: 7, prevLossScore: 0.2 })
    expect(r).toContain('ספי')
    expect(r).toContain('7 הפסדים')
  })

  it('is deterministic — identical input, identical output', () => {
    const ctx = { name: 'אשגרה', powerPos: 0.5, losses: 4, prevLossScore: 0.4 }
    expect(pickReason(ctx)).toBe(pickReason(ctx))
  })

  it('drops the countdown tier once the session is no longer live (timeRemaining absent)', () => {
    const live = pickReason({ name: 'ספי', powerPos: 0.3, losses: 4, prevLossScore: 0.4, timeRemaining: 0.1 })
    const settled = pickReason({ name: 'ספי', powerPos: 0.3, losses: 4, prevLossScore: 0.4 })
    expect(live).toContain('הזמן הולך ואוזל')
    expect(settled).not.toContain('הזמן הולך ואוזל')
  })
})
