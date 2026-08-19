/**
 * Roster of the "קובה של שבת" group — real players, their nicknames
 * (derived from the WhatsApp group export) and their default avatar
 * (emoji + color) so every player has a distinct image until they upload
 * their own. Nicknames are mean FIFA-grade banter — the group likes it
 * that way. The \`jab\` field is the one-liner roast shown under the player.
 */

export interface RosterEntry {
  /** Exact players.name value used in the database. */
  name: string
  /** Mean, catchy nickname in the group's spirit. */
  nickname: string
  /** One-line playful jab ("have that" trash talk). */
  jab: string
  /** Default avatar emoji shown on the AVATAR circle. */
  emoji: string
  /** Default avatar background color. */
  color: string
}

export const ROSTER: RosterEntry[] = [
  {
    name: 'יוסף',
    nickname: 'בעל הבית',
    jab: 'בתאילנד על החוף, במילואים בוכה — אך בקובה מפזר חוקים',
    emoji: '🧑',
    color: '#1e40af',
  },
  {
    name: 'ספי',
    nickname: 'המנכ״ל',
    jab: 'מריץ ליגה, מפזר חוקים, ומתחמק מתשלום',
    emoji: '📋',
    color: '#b91c1c',
  },
  {
    name: 'אשגרה',
    nickname: 'המפקד',
    jab: 'חוזר מהמילואים עם פקודות — ומפזר ריח של נרגילה במקפיא',
    emoji: '🎖️',
    color: '#7c2d12',
  },
  {
    name: 'זקי',
    nickname: 'זורק השלט',
    jab: 'שותק, ואז השלט עף — אל תתנו לו להפסיד',
    emoji: '💨',
    color: '#0f766e',
  },
  {
    name: 'מנש',
    nickname: 'שתיין האיצקו',
    jab: 'יוצא מהקובה ישר אל איצקו — צלחת, שוט, וחוב וויסקי',
    emoji: '🍼',
    color: '#a16207',
  },
  {
    name: 'ליאור',
    nickname: 'איש המילואים',
    jab: 'על המגן כבר שנים — והוויסקי שלו מחכה משנתיים',
    emoji: '🎖️',
    color: '#4d7c0f',
  },
  {
    name: 'אבי י',
    nickname: 'הפרשן',
    jab: 'מנתח את הכדור זהב כמו פרשן — שיאסוף גול זה כבר סיפור אחר',
    emoji: '🧭',
    color: '#3730a3',
  },
  {
    name: 'ישראל',
    nickname: 'הנסיך',
    jab: 'יושב על הכס ומחכה שהשער כבר יבוא להתבזבז',
    emoji: '🤴',
    color: '#86198f',
  },
]

/** Lookup a roster entry by player name (exact match). */
export function rosterFor(name: string): RosterEntry | undefined {
  return ROSTER.find((r) => r.name === name)
}

/** The one-line banter jab shown under a player. */
export function jabFor(name: string): string {
  return rosterFor(name)?.jab ?? 'חדש בקבוצה — בינתיים רק חטיפים.'
}
