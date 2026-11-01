import {
  BOT_API_KEY_MESSAGE,
  BOT_ERROR_MESSAGE,
  BOT_MODEL_MESSAGE,
  BOT_OUT_OF_CREDITS_MESSAGE,
  BOT_PROVIDER_DOWN_MESSAGE,
  BOT_RATE_LIMIT_MESSAGE,
} from '@/lib/bot/constants'

/** Provider failure carrying the real HTTP status + the provider's message. */
export class BotProviderError extends Error {
  readonly status: number
  readonly providerMessage: string

  constructor(status: number, providerMessage: string) {
    super(providerMessage || `AI provider HTTP ${status}`)
    this.name = 'BotProviderError'
    this.status = status
    this.providerMessage = providerMessage
  }
}

export class BotRateLimitError extends BotProviderError {
  constructor(providerMessage = 'AI provider rate limited') {
    super(429, providerMessage)
    this.name = 'BotRateLimitError'
  }
}

/**
 * A safe, Hebrew, user-facing explanation for a failed provider call. The group
 * sees *why* the bot went quiet instead of a vague "couldn't think" line —
 * notably exhausted credits (402), which is otherwise invisible.
 */
export function botFailureMessage(err: unknown): string {
  const status = err instanceof BotProviderError ? err.status : 0
  const text = err instanceof Error ? err.message : String(err)
  const lower = text.toLowerCase()
  if (status === 402 || /insufficient|credit|quota|balance|payment required/.test(lower)) {
    return BOT_OUT_OF_CREDITS_MESSAGE
  }
  if (status === 401 || status === 403 || /unauthorized|invalid.*key|forbidden|no auth/.test(lower)) {
    return BOT_API_KEY_MESSAGE
  }
  if (status === 429 || err instanceof BotRateLimitError || /rate limit|too many requests/.test(lower)) {
    return BOT_RATE_LIMIT_MESSAGE
  }
  if (status === 404 || /model.*(not found|unavailable)|no endpoints/.test(lower)) {
    return BOT_MODEL_MESSAGE
  }
  if (status >= 500 || /network error|fetch failed|timed? ?out/.test(lower)) {
    return BOT_PROVIDER_DOWN_MESSAGE
  }
  return BOT_ERROR_MESSAGE
}

/** One prior chat turn passed to the model for conversational memory. */
export interface ChatTurn {
  author: string
  text: string
  isBot?: boolean
}

export interface GenerateReplyOptions {
  system: string
  author: string
  userText: string
  /** Prior turns (oldest first) — the bot replies with this context in mind. */
  history?: ChatTurn[]
}

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions'
const MAX_TOKENS = 800
const DEFAULT_OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash'
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat'

// Full short sentences so a rate-limited reply still reads as a complete thought.
const FALLBACK_LINES = [
  'סבבה, שמעתי — נגיב לפי הקובה במוצ"ש הקרוב. 🥃',
  'אחח, עוד פעם הוא? נראה מה יקרה בשבת. 📣',
  'הוויסקי כבר בדרך לפי הכלל הבלתי כתוב — שאלתם כבר מי מביא? 🥃',
]

/** Progressive backoff (ms) between rate-limit retries, before jitter. */
const BACKOFF_MS = [400, 900, 1800]
const MAX_BACKOFF_MS = 4000

export type BotProvider = 'openrouter' | 'deepseek'

/** Active provider. `BOT_PROVIDER=deepseek` switches to DeepSeek's API directly. */
export function botProvider(): BotProvider {
  return (process.env.BOT_PROVIDER ?? '').trim().toLowerCase() === 'deepseek' ? 'deepseek' : 'openrouter'
}

/** Bearer key for the active provider (empty string when unset). */
export function botProviderKey(): string {
  return botProvider() === 'deepseek'
    ? (process.env.DEEPSEEK_API_KEY ?? '')
    : (process.env.OPENROUTER_API_KEY ?? '')
}

export function hasBotProviderKey(): boolean {
  return botProviderKey().trim().length > 0
}

/** Both providers expose an OpenAI-compatible chat-completions endpoint. */
function providerEndpoint(): string {
  return botProvider() === 'deepseek' ? DEEPSEEK_ENDPOINT : OPENROUTER_ENDPOINT
}

/**
 * PAID-ONLY model. The bot uses one model and one model only, for the active
 * provider (`DEEPSEEK_MODEL` / `OPENROUTER_MODEL`). No free tier, no silent
 * fallback; if the paid key/call fails, the reply fails.
 */
export function paidModelName(): string {
  return botProvider() === 'deepseek'
    ? process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL
    : process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL
}

/**
 * Read the provider's error body (`{ error: { message, code } }`) without ever
 * throwing — a non-JSON/empty body just yields an empty reason.
 */
async function readErrorBody(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: unknown; code?: unknown } }
    const message = body?.error?.message
    if (typeof message === 'string' && message.trim()) return message.trim()
    const code = body?.error?.code
    if (code != null) return String(code)
  } catch {
    /* non-JSON error body */
  }
  return ''
}

async function throwForResponse(res: Response): Promise<never> {
  throw new BotProviderError(res.status, await readErrorBody(res))
}

/**
 * POST a JSON body with shared rate-limit retry: exponential backoff + jitter
 * (so a burst doesn't resync into the next wall), capped at ~4s. Throws a
 * provider-specific error once the request keeps returning 429.
 */
async function fetchWithRetry(
  url: string,
  opts: { method: string; headers: Record<string, string>; body: string }
): Promise<Response> {
  let res: Response | null = null
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    if (attempt > 0) {
      const base = BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)] ?? 1000
      const jitter = Math.floor(Math.random() * 300)
      await new Promise((r) => setTimeout(r, Math.min(MAX_BACKOFF_MS, base + jitter)))
    }
    try {
      res = await fetch(url, { method: opts.method, headers: opts.headers, body: opts.body, cache: 'no-store' })
    } catch (e) {
      throw new Error(`network error: ${String(e)}`, { cause: e })
    }
    if (res.status === 429 && attempt < BACKOFF_MS.length) {
      continue
    }
    if (res.status === 429) {
      throw new BotRateLimitError((await readErrorBody(res)) || 'AI provider rate limited')
    }
    return res
  }
  // Unreachable; keep the type-checker honest.
  throw new Error('fetchWithRetry exhausted')
}

/** Shared prompt text for a human-authored turn (same shape in both callers). */
function humanTurn(text: string, author: string): string {
  return `הודעה מ-${author}:\n${text}`
}

/** Messages array sent to the active provider for any reply (stream or not). */
function buildMessages(opts: GenerateReplyOptions): { role: string; content: string }[] {
  return [
    { role: 'system', content: opts.system },
    ...(opts.history ?? []).map((t) => ({
      role: t.isBot ? 'assistant' : 'user',
      content: t.isBot ? t.text : humanTurn(t.text, t.author),
    })),
    { role: 'user', content: humanTurn(opts.userText, opts.author) },
  ]
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${botProviderKey()}`,
  }
}

/**
 * One-shot bot reply (non-streaming) against the active provider's paid model.
 * Used by the cron / batch `/api/bot` path. Errors surface, never fall through
 * to a free provider.
 */
export async function generateReply(opts: GenerateReplyOptions): Promise<string> {
  const res = await fetchWithRetry(providerEndpoint(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: paidModelName(),
      messages: buildMessages(opts),
      max_tokens: MAX_TOKENS,
    }),
  })
  if (!res.ok) await throwForResponse(res)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  return text || FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)]
}

/**
 * Stream the bot reply token-by-token from the active provider (SSE),
 * yielding each content chunk as it arrives. The caller owns converting this to
 * a response stream.
 */
export async function* streamReply(opts: GenerateReplyOptions): AsyncGenerator<string> {
  const res = await fetchWithRetry(providerEndpoint(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: paidModelName(), messages: buildMessages(opts), max_tokens: MAX_TOKENS, stream: true }),
  })
  if (!res.ok) await throwForResponse(res)
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]' || payload === '__DONE__') return
      try {
        const json = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] }
        const delta = json.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}