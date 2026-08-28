import { describe, expect, it } from 'vitest'
import { getJerusalemTimeOfDay, getSaturdayWeekKey } from './dateHelpers'

describe('getSaturdayWeekKey', () => {
  it('returns the same week_start_date (Saturday) for all days in a week', () => {
    // Week of Sat 2026-08-15 .. Fri 2026-08-21
    expect(getSaturdayWeekKey(new Date('2026-08-15T12:00:00Z'))).toBe('2026-08-15')
    expect(getSaturdayWeekKey(new Date('2026-08-16T12:00:00Z'))).toBe('2026-08-15')
    expect(getSaturdayWeekKey(new Date('2026-08-20T12:00:00Z'))).toBe('2026-08-15')
    expect(getSaturdayWeekKey(new Date('2026-08-21T20:00:00Z'))).toBe('2026-08-15')
  })

  it('rolls over on the next Saturday', () => {
    expect(getSaturdayWeekKey(new Date('2026-08-22T00:30:00Z'))).toBe('2026-08-22')
  })

  it('handles month boundaries', () => {
    // Sat 2026-08-29 is the last Saturday of August; Sep 1 falls in that week
    expect(getSaturdayWeekKey(new Date('2026-08-29T12:00:00Z'))).toBe('2026-08-29')
    expect(getSaturdayWeekKey(new Date('2026-09-01T12:00:00Z'))).toBe('2026-08-29')
  })

  it('treats a Saturday itself as the start of its own week', () => {
    expect(getSaturdayWeekKey(new Date('2026-08-15T08:00:00Z'))).toBe('2026-08-15')
  })
})

describe('getJerusalemTimeOfDay', () => {
  it('returns decimal Jerusalem wall-clock time (Israel is UTC+3 in summer)', () => {
    // 12:00Z = 15:00 IL
    expect(getJerusalemTimeOfDay(new Date('2026-08-15T12:00:00Z'))).toBeCloseTo(15)
    // 17:30Z = 20:30 IL
    expect(getJerusalemTimeOfDay(new Date('2026-08-15T17:30:00Z'))).toBeCloseTo(20.5)
  })

  it('wraps cleanly into the minutes', () => {
    // 16:00Z = 19:00 IL
    expect(getJerusalemTimeOfDay(new Date('2026-08-15T16:00:00Z'))).toBeCloseTo(19)
    // 13:37Z = 16:37 IL
    expect(getJerusalemTimeOfDay(new Date('2026-08-15T13:37:00Z'))).toBeCloseTo(16.62, 1)
  })
})
