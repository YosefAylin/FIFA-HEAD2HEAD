/**
 * Date helpers anchored to Israel time (Asia/Jerusalem).
 *
 * Two calendars coexist here:
 * - The weekly cycle (Saturday -> Friday) still drives the bot, whisky survey,
 *   odds and the gate. `week_start_date` is the Saturday.
 * - A "tournament day" is what the group actually plays: it runs from 02:00 to
 *   02:00 the next day, so a session that spills past midnight still counts as
 *   the same day. Day keys are derived from a match's `created_at`.
 */

const TZ = 'Asia/Jerusalem'

/** Hours after midnight before a new tournament day begins. */
export const TOURNAMENT_DAY_CUTOFF_HOURS = 2

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

/** The calendar day (YYYY-MM-DD) of `date` in Israel time. */
export function getJerusalemDayKey(date: Date): string {
  const { y, m, d } = toJerusalemParts(date)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
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

/** Jerusalem wall-clock as decimal hours (16.5 = 16:30). */
export function getJerusalemTimeOfDay(date: Date): number {
  const [hh, mm] = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
  })
    .format(date)
    .split(':')
  return Number(hh) + Number(mm ?? '0') / 60
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

// ---------------------------------------------------------------------------
// Tournament days (02:00 -> 02:00 boundary)
// ---------------------------------------------------------------------------

/**
 * The tournament day a moment belongs to, as YYYY-MM-DD. Shift the instant back
 * by the cutoff first, so 00:30 and 01:59 still count as the previous day.
 */
export function getTournamentDayKey(date: Date): string {
  const shifted = new Date(date.getTime() - TOURNAMENT_DAY_CUTOFF_HOURS * 60 * 60 * 1000)
  const { y, m, d } = toJerusalemParts(shifted)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** The tournament day key for a match's `created_at` timestamp. */
export function matchDayKey(createdAt: string): string {
  return getTournamentDayKey(new Date(createdAt))
}

/** The current tournament day key (02:00 -> 02:00 boundary). */
export function getCurrentTournamentDayKey(): string {
  return getTournamentDayKey(new Date())
}

/** Distinct tournament day keys present in matches, newest first. */
export function distinctDayKeys(matches: { created_at: string }[]): string[] {
  return [...new Set(matches.map((m) => matchDayKey(m.created_at)))].sort((a, b) =>
    b.localeCompare(a)
  )
}

/** Human-friendly day label, e.g. "יום שישי, 12 באוגוסט 2026". */
export function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Compact day label, e.g. "12 באוג׳ 2026". */
export function formatDayKeyShort(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/** Move a YYYY-MM-DD key by whole days (DST-safe — works on the calendar). */
function shiftDayKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Chat timestamps (WhatsApp-style day dividers + bubble times)
// ---------------------------------------------------------------------------

/** The calendar day (Israel time) a chat message was sent on. */
export function getChatDayKey(createdAt: string): string {
  return getJerusalemDayKey(new Date(createdAt))
}

/**
 * Day-separator label for the chat: "היום", "אתמול", or a full date
 * ("יום שישי, 12 באוגוסט" / with the year when it isn't the current one).
 */
export function formatChatDayLabel(dayKey: string, now: Date = new Date()): string {
  const todayKey = getJerusalemDayKey(now)
  if (dayKey === todayKey) return 'היום'
  if (dayKey === shiftDayKey(todayKey, -1)) return 'אתמול'

  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const sameYear = dayKey.slice(0, 4) === todayKey.slice(0, 4)
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)
}

/** Messages from the same author this close together read as one group. */
export const CHAT_GROUP_GAP_MS = 5 * 60 * 1000

/**
 * True when `current` continues the previous message's group: same author,
 * same calendar day, and sent within the grouping window (WhatsApp-style).
 */
export function sameChatGroup(
  previous: { author_name: string; created_at: string },
  current: { author_name: string; created_at: string }
): boolean {
  if (previous.author_name !== current.author_name) return false
  if (getChatDayKey(previous.created_at) !== getChatDayKey(current.created_at)) return false
  return (
    new Date(current.created_at).getTime() - new Date(previous.created_at).getTime() <=
    CHAT_GROUP_GAP_MS
  )
}
