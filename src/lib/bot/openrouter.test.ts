import { describe, expect, it } from 'vitest'
import {
  botFailureMessage,
  botProvider,
  botProviderKey,
  hasBotProviderKey,
  paidModelName,
  BotProviderError,
  BotRateLimitError,
} from './openrouter'
import {
  BOT_API_KEY_MESSAGE,
  BOT_ERROR_MESSAGE,
  BOT_MODEL_MESSAGE,
  BOT_OUT_OF_CREDITS_MESSAGE,
  BOT_PROVIDER_DOWN_MESSAGE,
  BOT_RATE_LIMIT_MESSAGE,
} from './constants'

const ENV_KEYS = [
  'BOT_PROVIDER',
  'OPENROUTER_MODEL',
  'DEEPSEEK_MODEL',
  'OPENROUTER_API_KEY',
  'DEEPSEEK_API_KEY',
] as const

/** Run `fn` with a temporary env override, restoring everything afterwards. */
function withEnv<T>(vars: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>, fn: () => T): T {
  const before: Record<string, string | undefined> = {}
  for (const key of ENV_KEYS) before[key] = process.env[key]
  try {
    for (const [key, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    return fn()
  } finally {
    for (const key of ENV_KEYS) {
      if (before[key] === undefined) delete process.env[key]
      else process.env[key] = before[key]
    }
  }
}

/**
 * GREEN-FIELD LOCK: the bot must use one paid model only (no `:free` tier, no
 * silent fallback), and must be able to target either OpenRouter or the direct
 * DeepSeek API via `BOT_PROVIDER`.
 */
describe('provider + model selection', () => {
  it('defaults to OpenRouter with a paid model (never :free)', () => {
    withEnv({ BOT_PROVIDER: undefined, OPENROUTER_MODEL: undefined, DEEPSEEK_MODEL: undefined }, () => {
      expect(botProvider()).toBe('openrouter')
      expect(paidModelName()).toBeTruthy()
      expect(paidModelName()).not.toMatch(/:free$/i)
    })
  })

  it('honors OPENROUTER_MODEL when the provider is openrouter', () => {
    withEnv({ BOT_PROVIDER: 'openrouter', OPENROUTER_MODEL: 'deepseek/deepseek-chat' }, () => {
      expect(paidModelName()).toBe('deepseek/deepseek-chat')
    })
  })

  it('switches to the direct DeepSeek API when BOT_PROVIDER=deepseek', () => {
    withEnv({ BOT_PROVIDER: 'DEEPSEEK', DEEPSEEK_MODEL: undefined }, () => {
      expect(botProvider()).toBe('deepseek')
      expect(paidModelName()).toBe('deepseek-chat')
    })
    withEnv({ BOT_PROVIDER: 'deepseek', DEEPSEEK_MODEL: 'deepseek-reasoner' }, () => {
      expect(paidModelName()).toBe('deepseek-reasoner')
    })
  })

  it('reads the key for the active provider only', () => {
    withEnv({ BOT_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: 'dk', OPENROUTER_API_KEY: 'or' }, () => {
      expect(botProviderKey()).toBe('dk')
      expect(hasBotProviderKey()).toBe(true)
    })
    withEnv({ BOT_PROVIDER: 'deepseek', DEEPSEEK_API_KEY: undefined, OPENROUTER_API_KEY: 'or' }, () => {
      expect(hasBotProviderKey()).toBe(false)
    })
  })
})

/** The group must be told *why* the bot went quiet, not a vague catch-all. */
describe('botFailureMessage', () => {
  it('names exhausted credits (HTTP 402)', () => {
    expect(botFailureMessage(new BotProviderError(402, 'Insufficient credits'))).toBe(
      BOT_OUT_OF_CREDITS_MESSAGE
    )
  })

  it('detects insufficient credits from the provider text alone', () => {
    expect(botFailureMessage(new Error('402 insufficient credits'))).toBe(BOT_OUT_OF_CREDITS_MESSAGE)
  })

  it('names API-key problems', () => {
    expect(botFailureMessage(new BotProviderError(401, 'No auth credentials found'))).toBe(
      BOT_API_KEY_MESSAGE
    )
  })

  it('names rate limits', () => {
    expect(botFailureMessage(new BotRateLimitError())).toBe(BOT_RATE_LIMIT_MESSAGE)
  })

  it('names a missing model', () => {
    expect(botFailureMessage(new BotProviderError(404, 'No endpoints found'))).toBe(BOT_MODEL_MESSAGE)
  })

  it('names a provider/network outage', () => {
    expect(botFailureMessage(new Error('network error: fetch failed'))).toBe(BOT_PROVIDER_DOWN_MESSAGE)
    expect(botFailureMessage(new BotProviderError(503, 'upstream down'))).toBe(BOT_PROVIDER_DOWN_MESSAGE)
  })

  it('falls back to the generic line for unknown failures', () => {
    expect(botFailureMessage(new BotProviderError(400, 'bad request'))).toBe(BOT_ERROR_MESSAGE)
    expect(botFailureMessage(new Error('boom'))).toBe(BOT_ERROR_MESSAGE)
  })
})
