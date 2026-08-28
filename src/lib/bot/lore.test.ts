import { describe, expect, it } from 'vitest'
import { parseLore, compactLore, appendLoreNote } from './lore'

describe('parseLore', () => {
  it('parses authored timestamped lines, dropping system noise', () => {
    const raw = [
      '[30.9.2024, 19:19:57] אברהם אחי: נכנסים בקו 11 שמעתי',
      '[30.9.2024, 19:20:00] ספי: שמעתי אותך',
    ].join('\n')
    const parsed = parseLore(raw)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({ author: 'אברהם אחי', content: 'נכנסים בקו 11 שמעתי' })
    expect(parsed[1]).toEqual({ author: 'ספי', content: 'שמעתי אותך' })
  })

  it('drops sticker/media notification lines', () => {
    const raw = '[1.1.2025, 10:00:00] יוסף: סטיקר הושמט'
    expect(parseLore(raw)).toHaveLength(0)
  })
})

describe('compactLore', () => {
  it('bounds the excerpt to near the target size', () => {
    const flat = Array.from({ length: 40 }, (_, i) => `[1.1.2025, 12:0${i % 10}:00] שחקן${i}: הודעה מספר ${i} קצרה`)
    const excerpt = compactLore(flat.join('\n'))
    expect(excerpt.length).toBeLessThanOrEqual(3560)
  })

  it('dedups exact repeats', () => {
    const raw = [
      '[1.1.2025, 10:00:00] יוסף: תוכף',
      '[1.1.2025, 10:05:00] יוסף: תוכף',
    ].join('\n')
    const excerpt = compactLore(raw)
    expect(excerpt.split('\n').filter((l) => l.includes('יוסף: תוכף'))).toHaveLength(1)
  })

  it('returns empty for an empty / all-noise export', () => {
    expect(compactLore('')).toBe('')
    expect(compactLore('[1.1.2025, 10:00:00] y: סטיקר הושמט')).toBe('')
  })
})

describe('appendLoreNote', () => {
  it('appends a note under the manual header on top of existing lore', () => {
    const out = appendLoreNote('אורי: ניצחנו 3-0\nספי: רגע, אף אחד לא עצר', 'אורן החמיץ שלושה פנדלים')
    expect(out).toBe('אורי: ניצחנו 3-0\nספי: רגע, אף אחד לא עצר\nעדכון שדווח ידנית (מה קרה לאחרונה):\nאורן החמיץ שלושה פנדלים')
  })

  it('keeps the note whole even when the base is trimmed for space', () => {
    const existing = Array.from({ length: 500 }, (_, i) => `שחקן${i}`).join('')
    const note = 'ניצחון מטורף בשבת'
    const out = appendLoreNote(existing, note, 200)
    expect(out).toContain(note)
    expect(out).toContain('עדכון שדווח ידנית (מה קרה לאחרונה):')
    expect([...out].length).toBeLessThanOrEqual(220)
    // The newest base content survives the trim.
    expect(out.includes('שחקן499')).toBe(true)
  })

  it('returns just the note when there is no existing lore', () => {
    const out = appendLoreNote('', 'משה: שבירת שיא')
    expect(out).toBe('עדכון שדווח ידנית (מה קרה לאחרונה):\nמשה: שבירת שיא')
  })

  it('ignores empty notes and never shrinks the base', () => {
    expect(appendLoreNote('לא: נשאר', '   ')).toBe('לא: נשאר')
  })
})
