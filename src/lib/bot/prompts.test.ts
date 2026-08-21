import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, sanitizeReply } from './prompts'
import { BOT_NAME } from './constants'

describe('sanitizeReply', () => {
  it('strips markdown, URLs, and collapses whitespace', () => {
    expect(sanitizeReply('  היי **כולם** https://x.com/a\n\n   איך *עבר*?  ')).toBe('היי כולם איך עבר?')
  })

  it('enforces a 500-char body without splitting an emoji cluster', () => {
    const long = 'א'.repeat(600)
    const out = sanitizeReply(long)
    expect([...out].length).toBeLessThanOrEqual(500)
  })

  it('never cuts a long reply mid-word (the truncation bug)', () => {
    // A long Hebrew run past the 500 limit — the old hard char-slice chopped
    // it into a dangling syllable ("…מבטי" / "…שי" seen in production).
    const long = 'ספי הוא המנכ"ל שתמיד "שוכח" וויסקי, ומבריז או דואג לאחרים שי' +
      Array.from({ length: 50 }, (_, i) => ` יתר תוכן ארוך ${i}`).join('') + ' ממשיך'
    const out = sanitizeReply(long)
    expect([...out].length).toBeLessThanOrEqual(500)
    // The output must be a whole-word prefix: if it was truncated, the source
    // continues at a word boundary (space/end), never mid-token.
    const idx = long.indexOf(out)
    expect(idx).toBe(0) // kept from the start
    const rest = long.slice(out.length)
    expect(rest === '' || /^\s/.test(rest)).toBe(true)
  })

  it('backs off to the last whole word when the 500-cut lands mid-word', () => {
    // Source is whole words; a char-slice to 500 lands inside some word.
    const long = 'תוכן ארוך '.repeat(100)
    const out = sanitizeReply(long)
    expect([...out].length).toBeLessThanOrEqual(500)
    // Output is a prefix that ends exactly on a space boundary.
    const rest = long.slice(out.length)
    expect(rest === '' || /^\s/.test(rest)).toBe(true)
  })

  it('returns a fallback for empty input', () => {
    expect(sanitizeReply('')).toBeTruthy()
    expect(sanitizeReply('```\n```')).toBeTruthy()
  })

  it('strips leaked chain-of-thought ("THOUGHT:") from the reply', () => {
    const leaked = 'THOUGHT: The user is asking for a board update. I should list the digest.\n\nמוביל כרגע יוסף עם 42 נקודות. 🥃'
    const out = sanitizeReply(leaked)
    expect(out).not.toContain('THOUGHT')
    expect(out).toContain('יוסף')
    expect(out).toContain('42')
  })

  it('strips leaked "Confidence Score / Final Answer" framing', () => {
    const leaked = 'Confidence Score: 5/5 Final Answer: "לא נכון. אין שום נתון כזה בדיגסט."'
    const out = sanitizeReply(leaked)
    expect(out).not.toContain('Confidence')
    expect(out).not.toContain('Final Answer')
    expect(out).toContain('לא נכון')
  })

  it('collapses an exact repeated sentence', () => {
    const dup = '"לא נכון. אין שום נתון כזה בדיגסט."לא נכון. אין שום נתון כזה בדיגסט.'
    const out = sanitizeReply(dup)
    expect(out).toBe('לא נכון. אין שום נתון כזה בדיגסט.')
  })
})

describe('buildSystemPrompt', () => {
  it('embeds the digest and bot identity', () => {
    const out = buildSystemPrompt('טבלת כל הזמנים:\n1. יוסף — 12 נק')
    expect(out).toContain(BOT_NAME)
    expect(out).toContain('טבלת כל הזמנים:\n1. יוסף — 12 נק')
    expect(out).toContain('500 תווים')
  })

  it('tells the model not to invent data', () => {
    expect(buildSystemPrompt('d')).toContain('אל תמציא')
  })
})
