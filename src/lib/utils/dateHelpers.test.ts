import { describe, expect, it } from 'vitest'
import { getSaturdayWeekKey } from './dateHelpers'

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
