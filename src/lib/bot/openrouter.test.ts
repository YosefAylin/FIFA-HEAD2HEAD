import { describe, expect, it } from 'vitest'
import { paidModelName, botFailureMessage, OpenRouterApiError, OpenRouterRateLimitError } from './openrouter'
import {
  BOT_API_KEY_MESSAGE,
  BOT_ERROR_MESSAGE,
  BOT_MODEL_MESSAGE,
  BOT_OUT_OF_CREDITS_MESSAGE,
  BOT_PROVIDER_DOWN_MESSAGE,
  BOT_RATE_LIMIT_MESSAGE,
} from './constants'

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

/** The group must be told *why* the bot went quiet, not a vague catch-all. */
describe('botFailureMessage', () => {
  it('names exhausted credits (HTTP 402)', () => {
    expect(botFailureMessage(new OpenRouterApiError(402, 'Insufficient credits'))).toBe(
      BOT_OUT_OF_CREDITS_MESSAGE
    )
  })

  it('detects insufficient credits from the provider text alone', () => {
    expect(botFailureMessage(new Error('402 insufficient credits'))).toBe(BOT_OUT_OF_CREDITS_MESSAGE)
  })

  it('names API-key problems', () => {
    expect(botFailureMessage(new OpenRouterApiError(401, 'No auth credentials found'))).toBe(
      BOT_API_KEY_MESSAGE
    )
  })

  it('names rate limits', () => {
    expect(botFailureMessage(new OpenRouterRateLimitError())).toBe(BOT_RATE_LIMIT_MESSAGE)
  })

  it('names a missing model', () => {
    expect(botFailureMessage(new OpenRouterApiError(404, 'No endpoints found'))).toBe(BOT_MODEL_MESSAGE)
  })

  it('names a provider/network outage', () => {
    expect(botFailureMessage(new Error('network error: fetch failed'))).toBe(BOT_PROVIDER_DOWN_MESSAGE)
    expect(botFailureMessage(new OpenRouterApiError(503, 'upstream down'))).toBe(BOT_PROVIDER_DOWN_MESSAGE)
  })

  it('falls back to the generic line for unknown failures', () => {
    expect(botFailureMessage(new OpenRouterApiError(400, 'bad request'))).toBe(BOT_ERROR_MESSAGE)
    expect(botFailureMessage(new Error('boom'))).toBe(BOT_ERROR_MESSAGE)
  })
})
