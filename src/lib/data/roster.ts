/**
 * Roster of the "קובה של שבת" group — real players, their nicknames,
 * default avatars (emoji + color), and per-member banter lines.
 *
 * `name` is the exact players.name value used in the database (the group's
 * own nickname, e.g. ספי). `realName` is the member's actual name when it
 * differs (ספי→אסף, שרגיץ'→שרגא, etc). `lines` are sharp per-member one-liners
 * authored from the WhatsApp group export — they rotate on the home page and
 * feed the bot. The `jab` is the one-line roast shown under the player.
 *
 * Pre-first-weekend flavor is baked into the lines following the group's
 * power ranking: 1) יוסף 2) ליאור 3) אשגרה 4) ספי — the rest are fodder.
 */

import { BOT_NAME } from '@/lib/bot/constants'

/** A single banter line with its writer attribution ('' = unknown user). */
export interface BanterLine {
  text: string
  /** Writer: `BOT_NAME` for bot-authored lines, or a member's identity name. */
  author?: string
}

export interface RosterEntry {
  /** Exact players.name value used in the database. */
  name: string
  /** The member's real name, when it differs from their group `name`. */
  realName?: string
  /** Mean, catchy nickname in the group's spirit. */
  nickname: string
  /** One-line playful jab ("have that" trash talk). */
  jab: string
  /** Per-member banter lines (shown on the home card, attributed to the bot). */
  lines: string[]
  /** Default avatar emoji shown on the AVATAR circle. */
  emoji: string
  /** Default avatar background color. */
  color: string
}

export const ROSTER: RosterEntry[] = [
  {
    name: 'יוסף',
    nickname: 'GOAT',
    jab: 'הכי טוב בפיפ״א בפער, מזלזל בכולם בצדק, מנהל את הקופה ומשאיר אתכם לקנא',
    lines: [
      'יוסף תופס את השלט, נותן לכם בראש, ושולח אתכם לשלם בפייבוקס.',
      'אף אחד לא מתקרב לרמה של יוסף בפיפ״א, תמשיכו לחלום.',
      'יוסף עדיין מקום ראשון גם כשהוא משחק ביד אחת.',
    ],
    emoji: '👑',
    color: '#1e40af',
  },
  {
    name: 'ספי',
    realName: 'אסף',
    nickname: 'בר קמצא',
    jab: 'חי בסרט שהוא מנכ״ל, בפועל מקום 4, חזק ברצועה וצריך אישור א׳ כדי לצאת מהבית',
    lines: [
      'ספי שוב פותח את השבת עם היינקן מוקדם באגמים ומפנטז על מקום ראשון.',
      'יבר קמצא, קיבלת כבר אישור א׳ לצאת או שאתה שוב פותח סקרים באוויר?',
      'ספי לוקח מריצה מהעבודה בבוץ, מכריז על מהפכה וחוטף בראש.',
    ],
    emoji: '⛓️',
    color: '#b91c1c',
  },
  {
    name: 'אשגרה',
    realName: 'שרגא',
    nickname: 'המנכ״ל',
    jab: 'המנכ״ל הרשמי ומקום 3, מזמין לדירה כשהשירותים שבורים ומתלונן על הטינופת',
    lines: [
      'אשגרה שוב חזר מתאילנד ועדיין לא תיקן את השירותים בדירה.',
      'המנכ״ל של הקובה — תביאו דלי מהבית כי המקרר והשירותים בהדממה.',
      'אשגרה מאיים בטכני, אבל מסיים שוב במקום השלישי.',
    ],
    emoji: '👔',
    color: '#7c2d12',
  },
  {
    name: 'זקי',
    realName: 'אברהם',
    nickname: 'הריאליסט',
    jab: 'אוהד ריאל שחוטף השפלות מבארסה, מחפש קומבינות ומבטיח בקבוק שלא מגיע',
    lines: [
      'זקי רואה משחקים של בארסה רק כדי להתבאס, ואז שותה ערק כדי לשכוח.',
      'איפה הבקבוק שאתה חייב זקי? שוב נעלם באיצקו ומחפש שחרחרות?',
      'זקי דופק הרצאות על כדורגל, אבל בפיפ״א מקבל בראש ושותק.',
    ],
    emoji: '🥃',
    color: '#0f766e',
  },
  {
    name: 'מנש',
    realName: 'מנשה',
    nickname: 'המשוגע ברצועה',
    jab: 'מבריזן מקצועי שחי על אישור א׳ מהאישה, מגיע בהונדה החדשה ועושה בלאגן באיצקו',
    lines: [
      'מנש נזכר להגיע לקובה רק כשיש אישור א׳ מהאישה וההונדה מונעת.',
      'היונדאי כבר מתה מזמן, אבל מנשה עדיין מבריז באותה רמה.',
      'מנש שותה שישייה לבד, עושה בלאגן שלם, ואז נעלם לאיצקו.',
    ],
    emoji: '🚗',
    color: '#a16207',
  },
  {
    name: 'ליאור',
    nickname: 'הסגן המעופף',
    jab: 'מקום 2 קבוע, מקסס וויד בלי סוף בדירה ומערבב עם וויסקי כאילו זה מים',
    lines: [
      'ליאור מפרק ראשים בדירה, שותה וויסקי, ועדיין מסיים מקום שני.',
      'מה עם המילואים ליאור? שוב סוגר שבת או שאתה בא לקחת מקום שני?',
      'ליאור מגיע ישר מהבסיס, לא רואה בעיניים ומשפיל את ספי.',
    ],
    emoji: '🌿',
    color: '#4d7c0f',
  },
  {
    name: 'אבי',
    nickname: 'השטיח המודח',
    jab: 'השטיח הרשמי שחטף השפלות בפיפ״א, הפסיק להגיע מרוב פחד והודח בבושת פנים',
    lines: [
      'אבי קיבל צהוב, קיבל אדום, ובסוף פשוט ברח מההשפלות.',
      'השטיח של הקובה — תמיד ממליץ על מוצרים אבל בפיפ״א לא נוגע בשלט.',
      'אבי הודח רשמית מהטורניר כדי לחסוך לעצמו ארגזים של וויסקי.',
    ],
    emoji: '🚪',
    color: '#3730a3',
  },
  {
    name: 'ישראל',
    nickname: 'האבא הטרי',
    jab: 'נהיה אבא ונעלם מהמפה — נשאר בזיכרון של הקובה מפעם',
    lines: [
      'ישראל נהיה אבא ושכח איך נראה שלט של סוני.',
      'האגדה מספרת שישראל עדיין מחפש אישור יציאה מהבית.',
      'ישראל פרש בשיא — ככה זה כשמחליפים פיפ״א בחיתולים.',
    ],
    emoji: '🍼',
    color: '#86198f',
  },
]

/**
 * The group's frozen power ranking, best first. Base order the odds card
 * starts from and falls back to before it live-nudges by current-season
 * points. Only real player `name`s — nicknames/jabs are never touched here.
 */
export const POWER_RANK: string[] = [
  'יוסף',
  'ליאור',
  'אשגרה',
  'ספי',
  'זקי',
  'מנש',
  'אבי',
  'ישראל',
]

/**
 * The group's binding rule: whoever finishes last ("the victim") owes a whisky
 * at the next tournament. Shared by the odds card, the tournament tab, and the
 * bot's prompt so everyone (and the bot) speaks one consistent truth.
 */
export const WHISKY_RULE =
  'מקום אחרון מביא וויסקי ברזל לשבוע הבא. מפסיד פעמיים ברציפות מקבל פטור, והמקום שלפניו מביא. שאר החבר׳ה דואגים לבירות, פיצוחים וחטיפים (תפוצ׳יפס, דוריטוס, במבה) ומאנץ׳. 🥃'

/** Lookup a roster entry by player name (exact match). */
export function rosterFor(name: string): RosterEntry | undefined {
  return ROSTER.find((r) => r.name === name)
}

/** The one-line banter jab shown under a player. */
export function jabFor(name: string): string {
  return rosterFor(name)?.jab ?? 'חדש בקבוצה — בינתיים רק חטיפים.'
}

/** All per-member lines as a flat pool (author = the bot). */
export function rosterBanterLines(): BanterLine[] {
  return ROSTER.flatMap((r) =>
    r.lines.map((text) => ({ text, author: BOT_NAME }))
  )
}