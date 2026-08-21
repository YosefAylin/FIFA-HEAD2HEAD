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

/** A single banter line with its writer attribution ('' = unknown user). */
export interface BanterLine {
  text: string
  /** Writer: 'bot' for authored lines, or a member's identity name. */
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
    nickname: 'הקיסר',
    jab: 'מנצח, נותן חסות, ואוסף את הוויסקי של כולם — אלוהי הטבלה',
    lines: [
      'יוסף נכנס בלי שיחה, תופס את השלט, ומשאיר את כולם לשלם.',
      'יוסף עדיין ראשון גם בשבוע שהוא רק נכנס לראות.',
      '״כל הכבוד לאסף״ — יוסף הוסיף לו חשבונית לוויסקי על המקום הזה.',
    ],
    emoji: '🧑',
    color: '#1e40af',
  },
  {
    name: 'ספי',
    realName: 'אסף',
    nickname: 'הלוזר הרשמי',
    jab: 'לוקח מריצה מהעבודה, מכריז מקום ראשון, וסוגר שבת בידיים ריקות — אבל את הוויסקי הוא שותה חינם',
    lines: [
      'ספי לוקח מריצה מהעבודה ומגיע אלוף — על הנייר של עצמו.',
      'ספי הכריז מקום ראשון — חכה, הטבלה עדיין מתעדכנת.',
      'הבידורית של ספי עובדת שעות נוספות — וגם הגביע מחכה לו במילואים.',
    ],
    emoji: '📋',
    color: '#b91c1c',
  },
  {
    name: 'אשגרה',
    realName: 'שרגא',
    nickname: 'הדובר',
    jab: 'מדבר בשם כל הקובה, נוסע עד חיפה בשביל ג׳ויסטיק, וכל שבוע נמאס לו להיות מקום ראשון',
    lines: [
      'אשגרה נוסע עד חיפה בשביל ג׳ויסטיק — ובכל זאת נשאר דובר, לא כובש.',
      'אשגרה 1 בטבלה הדמיונית — במקום 3 באמיתית, והמקפיא עדיין לא נקי.',
      'אשגרה נמאס לו כבר להיות מקום ראשון — שנודה לו שהוא עושה גם את זה כתרומה.',
    ],
    emoji: '🎖️',
    color: '#7c2d12',
  },
  {
    name: 'זקי',
    realName: 'אברהם',
    nickname: 'הריאליסט',
    jab: 'המפסיד של היום — אברהם. וזה לא דעה, זה התואר הפוליטי של עולם הכדורגל',
    lines: [
      'זקי מודה בהפסד בעצמו — ואז מוחק את ההודעה בשקט.',
      'זקי עושה הרצאה על כדור הזהב — איך עם תורה כזו עוד לא הבקיע.',
      '״בוקר טוב לעובדי כפיים״ — זקי כבר מפרק את הקובה עד הערב ושותק.',
    ],
    emoji: '💨',
    color: '#0f766e',
  },
  {
    name: 'מנש',
    realName: 'מנשה',
    nickname: 'הבכיין',
    jab: 'עונה באמוג׳י בוכה, בוכה על החוב, ומגיע באיצקו מרוצה מאוחר',
    lines: [
      'מנש עונה לכולם באמוג׳י בוכה — רק החוב שלו בוויסקי מסרב להיעלם.',
      'מנש מהקובה ישר לאיצקו — ואם הוא ראשון? גם אז הוא מביא בקבוק ובוכה על זה.',
      'מנשה חיים הרי בעיר — צריך לאסוף אותו, להרכיב אותו, ולסלוח לו.',
    ],
    emoji: '🍼',
    color: '#a16207',
  },
  {
    name: 'ליאור',
    nickname: 'הסגן',
    jab: 'סגן אלוף — בעוד הוא בכלל במילואים. על הדשא הוא לא נעלם, רק מהקובה הוא בריז',
    lines: [
      'ליאור סגן אלוף — ואין לו אפילו זמן לשחק, במילואים הוא אלוף.',
      'סלמתאק לעולם ועד — ואת הוויסקי הכי זול, רק ליאור יודע להביא.',
      'ליאור מקום שני בלי משחק — תן לו שעה בעיר ותראה מי כבר מדהים.',
    ],
    emoji: '🎖️',
    color: '#4d7c0f',
  },
  {
    name: 'אבי',
    nickname: 'השטיח',
    jab: 'השטיח שמקבל בראש וממשיך להמליץ לך על מוצר — בלי פואנטה, כמו תמיד',
    lines: [
      'אבי בלבל אתמול בלי פואנטה — והבוקר הוא גם את זה לא זוכר.',
      'אבי מחכה חודש לקנות בזול — את ההפסדים שלו אף אחד לא מוריד.',
      'אבי ממליץ לך מוצר, אוסף לך את הסל — ואת הוויסקי של ספי הוא משלם מהכיס של כולם.',
    ],
    emoji: '🧭',
    color: '#3730a3',
  },
  {
    name: 'ישראל',
    nickname: 'הנעלם',
    jab: 'בוואטספ הוא לא מופיע, בקובה עוקבים אחריו — ואומרים שהוא עדיין מחפש את השלט',
    lines: [
      'ישראל לא מדבר בוואטספ — ואם לא שומעים ממנו, כנראה גם לא מגיעים לקובה.',
      'כל הקובה כבר רשמה עליו — הוא עדיין לא יודע מאיזה צד תופסים את השלט.',
      'ישראל במקום אחרון בשתיקה — הכי חזק בתיקו, כי מעולם לא ניסה.',
    ],
    emoji: '🤴',
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
export const WHISKY_RULE = 'מי שמגיע אחרון מביא וויסקי לטורניר הבא. 🥃'

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
    r.lines.map((text) => ({ text, author: 'bot' }))
  )
}
