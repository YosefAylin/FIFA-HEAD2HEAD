/**
 * "שער הכניסה" — the first-visit question gate. The group's answer is a joke:
 * anything you're supposed to bring to the Kuba counts. Matching is deliberately
 * generous — niqqud/punctuation/spacing are stripped, and we accept the known
 * tokens plus close-enough typos (small edit distance).
 */

/** Accepted things-to-bring, with common spelling variants. */
export const ACCEPTED_ANSWERS = [
  'בירות',
  'בירה',
  'ויסקי',
  'וויסקי',
  'חטיפים',
  'חטיף',
  'מאנצ',
  'מנצ',
  'מאנץ',
  'הייניקן',
  'היינקן',
  'הפתעות',
  'הפתעה',
  'בולבול',
  'דיק',
  'כוס',
  'שתייה',
  'שתיה',
  'אלכוהול',
  'אוכל',
]

/** Admin passcode — bypasses the entry question and unlocks the manager page. */
export const ADMIN_PASSCODE = '123456'

/** True for the admin passcode (trimmed). */
export function isAdminPasscode(input: string): boolean {
  return input.trim() === ADMIN_PASSCODE
}

/** Strip niqqud / punctuation / geresh / spaces so spelling noise doesn't matter. */
export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0591-\u05c7]/g, '') // Hebrew niqqud + cantillation
    .replace(/[^א-תa-z0-9]/gi, '') // keep only letters/digits (drops geresh, spaces, punctuation)
    .toLowerCase()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const curr = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[n]
}

/** True if the answer is (or closely resembles) something you bring to the Kuba. */
export function isAcceptedAnswer(input: string): boolean {
  const value = normalizeAnswer(input)
  if (!value) return false

  for (const token of ACCEPTED_ANSWERS) {
    const t = normalizeAnswer(token)
    if (!t) continue
    // Exact / substring either way (handles "בירות קרות", "הייניקן וחטיפים").
    if (value.includes(t) || (value.length >= 3 && t.includes(value))) return true
    // Close-enough typo tolerance: 1 edit for short words, 2 for longer ones.
    const maxDistance = t.length <= 4 ? 1 : 2
    if (levenshtein(value, t) <= maxDistance) return true
  }
  return false
}
