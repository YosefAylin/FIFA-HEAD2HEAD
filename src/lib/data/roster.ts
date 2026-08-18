/**
 * Roster of the "קובה של שבת" group — real players, their nicknames
 * (derived from the WhatsApp group export) and their default avatar
 * (emoji + color) so every player has a distinct image until they upload
 * their own.
 */

export interface RosterEntry {
  /** Exact players.name value used in the database. */
  name: string
  /** Fun nickname used in banter + cards. */
  nickname: string
  /** Default avatar emoji shown on the AVATAR circle. */
  emoji: string
  /** Default avatar background color. */
  color: string
}

export const ROSTER: RosterEntry[] = [
  {
    name: 'יוסף',
    nickname: 'המנכ"ל',
    emoji: '🧠',
    color: '#1e40af',
  },
  {
    name: 'ספי',
    nickname: 'הרמקול',
    emoji: '📣',
    color: '#b91c1c',
  },
  {
    name: 'אשגרה',
    nickname: 'וויסקי',
    emoji: '🥃',
    color: '#7c2d12',
  },
  {
    name: 'זקי',
    nickname: 'הרגוע',
    emoji: '😎',
    color: '#0f766e',
  },
  {
    name: 'ליאור',
    nickname: 'השקט',
    emoji: '🤫',
    color: '#4d7c0f',
  },
  {
    name: 'אבי י',
    nickname: 'המארגן',
    emoji: '🧭',
    color: '#3730a3',
  },
  {
    name: 'ישראל',
    nickname: 'הנסיך',
    emoji: '🤴',
    color: '#86198f',
  },
]

/** Lookup a roster entry by player name (exact match). */
export function rosterFor(name: string): RosterEntry | undefined {
  return ROSTER.find((r) => r.name === name)
}