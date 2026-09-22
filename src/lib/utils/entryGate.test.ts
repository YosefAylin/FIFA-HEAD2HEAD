import { describe, expect, it } from 'vitest'
import { isAcceptedAnswer, normalizeAnswer } from './entryGate'

describe('normalizeAnswer', () => {
  it('strips niqqud, geresh, punctuation and spaces', () => {
    expect(normalizeAnswer('בִּירוֹת')).toBe('בירות')
    expect(normalizeAnswer("מאנצ'")).toBe('מאנצ')
    expect(normalizeAnswer('ויסקי!')).toBe('ויסקי')
    expect(normalizeAnswer('היי ניקן')).toBe('הייניקן')
  })
})

describe('isAcceptedAnswer', () => {
  it('accepts every listed thing-to-bring and its variants', () => {
    for (const a of ['בירות', 'ויסקי', 'וויסקי', 'חטיפים', 'מאנצ׳', 'הייניקן', 'הפתעות', 'בולבול', 'דיק', 'כוס']) {
      expect(isAcceptedAnswer(a), a).toBe(true)
    }
  })

  it('accepts them inside a longer sentence', () => {
    expect(isAcceptedAnswer('אני מביא בירות קרות')).toBe(true)
    expect(isAcceptedAnswer('הייניקן וחטיפים')).toBe(true)
  })

  it('tolerates close typos', () => {
    expect(isAcceptedAnswer('בירו')).toBe(true) // near בירות
    expect(isAcceptedAnswer('ויסקיי')).toBe(true)
  })

  it('rejects empty or unrelated answers', () => {
    expect(isAcceptedAnswer('')).toBe(false)
    expect(isAcceptedAnswer('   ')).toBe(false)
    expect(isAcceptedAnswer('מכונית')).toBe(false)
    expect(isAcceptedAnswer('שלום')).toBe(false)
  })
})
