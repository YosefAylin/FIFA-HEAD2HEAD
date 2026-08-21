/**
 * Weekly cycle helpers, anchored to Israel time (Asia/Jerusalem).
 * A "week" runs Saturday -> Friday. week_start_date is the Saturday.
 */

const TZ = 'Asia/Jerusalem'

function toJerusalemParts(date: Date): { y: number; m: number; d: number } {
  // Format a date in Israel time and re-parse the Y/M/D components.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const [y, m, d] = parts.split('-').map(Number)
  return { y, m, d }
}

/** True if the given Date (in Israel time) is a Saturday. */
export function isSaturday(date: Date): boolean {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
  }).format(date) === 'Sat'
}

/** The current hour in Israel time (0-23). */
export function getJerusalemHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date)
  )
}

/**
 * Returns the Saturday that starts the cycle containing `date`,
 * computed in Israel time. Week start = most recent Saturday.
 */
export function getSaturdayWeekKey(date: Date): string {
  const { y, m, d } = toJerusalemParts(date)
  const asUTC = new Date(Date.UTC(y, m - 1, d))
  const daysSinceSaturday = (asUTC.getUTCDay() + 1) % 7 // Sat=0, Sun=1, ..., Fri=6
  const weekStart = new Date(asUTC)
  weekStart.setUTCDate(asUTC.getUTCDate() - daysSinceSaturday)
  return weekStart.toISOString().slice(0, 10)
}

/** The current cycle's week_start_date, as YYYY-MM-DD. */
export function getCurrentWeekKey(): string {
  return getSaturdayWeekKey(new Date())
}

/**
 * Returns the list of previous week keys going back `weeks` cycles,
 * most recent first, including the current week.
 */
export function getRecentWeekKeys(weeks: number): string[] {
  const keys: string[] = []
  const today = new Date()
  for (let i = 0; i < weeks; i++) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i * 7)
    const key = getSaturdayWeekKey(d)
    if (!keys.includes(key)) keys.push(key)
  }
  return keys
}

/** Human-friendly display for a week key, e.g. "12 באוגוסט 2026". */
export function formatWeekKey(weekKey: string): string {
  const [y, m, d] = weekKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
