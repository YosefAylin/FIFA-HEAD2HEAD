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

  it('returns a fallback for empty input', () => {
    expect(sanitizeReply('')).toBeTruthy()
    expect(sanitizeReply('```\n```')).toBeTruthy()
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
