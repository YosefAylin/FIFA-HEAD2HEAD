import { describe, expect, it } from 'vitest'
import { paidModelName } from './gemini'

/**
 * GREEN-FIELD LOCK: the bot must use the paid OpenRouter model only. This test
 * pins the default so a future refactor can't silently reintroduce a free-tier
 * (`:free`) or a separate fallback model.
 */
describe('paidModelName (paid-only model chain)', () => {
  it('defaults to a paid OpenRouter model, never a :free tier', () => {
    const m = paidModelName()
    expect(m).toBeTruthy()
    expect(m).not.toMatch(/:free$/i)
  })

  it('respects an explicit OPENROUTER_MODEL when set', () => {
    const before = process.env.OPENROUTER_MODEL
    process.env.OPENROUTER_MODEL = 'deepseek/deepseek-chat'
    try {
      expect(paidModelName()).toBe('deepseek/deepseek-chat')
    } finally {
      if (before === undefined) delete process.env.OPENROUTER_MODEL
      else process.env.OPENROUTER_MODEL = before
    }
  })
})
