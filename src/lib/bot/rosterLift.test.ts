import { describe, expect, it } from 'vitest'
import { applyLift, truncateAtWord } from './rosterLift'

describe('applyLift (jab derivation map write)', () => {
  it('writes a fresh jab for a player with no jab override yet, and adds no nickname key', () => {
    const { next, applied } = applyLift({}, [{ name: 'יוסף', jab: 'אלוף הטבלה' }])
    expect(applied).toBe(1)
    expect(next.יוסף).toEqual({ jab: 'אלוף הטבלה' })
    expect(next.יוסף?.nickname).toBeUndefined()
  })

  it('never touches an existing nickname when refreshing a jab', () => {
    const { next } = applyLift(
      { יוסף: { nickname: 'הקיסר', jab: 'אלוף' } },
      [{ name: 'יוסף', jab: 'אלוף עוד פעם' }]
    )
    expect(next.יוסף).toEqual({ nickname: 'הקיסר', jab: 'אלוף עוד פעם' })
  })

  it('never lets a nickname sneak through even if a candidate carries one', () => {
    const sneaky = { name: 'יוסף', jab: 'גנב את השלט', nickname: 'המתחזה' } as unknown as { name: string; jab: string }
    const { next } = applyLift({}, [sneaky])
    expect(next.יוסף?.nickname).toBeUndefined()
    expect(next.יוסף?.jab).toBe('גנב את השלט')
  })

  it('drops empty jab candidates without counting them', () => {
    const { next, applied } = applyLift({}, [{ name: 'ישראל', jab: '' }])
    expect(applied).toBe(0)
    expect(next).toEqual({})
  })

  it('adds a new player entry without disturbing an existing one', () => {
    const { next, applied } = applyLift(
      { יוסף: { jab: 'אלוף' } },
      [{ name: 'אשגרה', jab: 'דובר' }]
    )
    expect(applied).toBe(1)
    expect(next.אשגרה).toEqual({ jab: 'דובר' })
    expect(next.יוסף).toEqual({ jab: 'אלוף' })
  })
})

describe('truncateAtWord (jab/banter line cap)', () => {
  it('keeps a short line untouched (trimmed)', () => {
    expect(truncateAtWord('  אלוף הטבלה  ', 160)).toBe('אלוף הטבלה')
  })

  it('backs off to the last whole word instead of cutting mid-word', () => {
    const long = 'ספי שוב הכריז מקום ראשון אבל הוויסקי' + ' עוד פעם'.repeat(30)
    const out = truncateAtWord(long, 60)
    expect([...out].length).toBeLessThanOrEqual(60)
    // Not a dangling syllable: the cut sits on a space boundary.
    const idx = long.indexOf(out)
    expect(idx).toBe(0)
    const rest = long.slice(out.length)
    expect(rest === '' || /^\s/.test(rest)).toBe(true)
  })

  it('never splits an emoji cluster', () => {
    const long = 'אלוף' + '🥃'.repeat(60) + ' עוד'
    const out = truncateAtWord(long, 50)
    for (const ch of [...out]) expect(ch).not.toBe('�') // no replacement chars
  })
})