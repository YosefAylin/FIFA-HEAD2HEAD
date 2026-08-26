export class OpenRouterRateLimitError extends Error {}

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
const MAX_TOKENS = 800
const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash'

// Full short sentences so a rate-limited reply still reads as a complete thought.
const FALLBACK_LINES = [
  'סבבה, שמעתי — נגיב לפי הקובה במוצ"ש הקרוב. 🥃',
  'אחח, עוד פעם הוא? נראה מה יקרה בשבת. 📣',
  'הוויסקי כבר בדרך לפי הכלל הבלתי כתוב — שאלתם כבר מי מביא? 🥃',
]

/** Progressive backoff (ms) between rate-limit retries, before jitter. */
const BACKOFF_MS = [400, 900, 1800]
const MAX_BACKOFF_MS = 4000

/**
 * PAID-ONLY model. The bot uses one model and one model only — the paid
 * OpenRouter model configured in `OPENROUTER_MODEL`. No free tier, no Gemini.
 * If the paid key/call fails, the reply FAILS (cooldown + on-screen note); we
 * never silently swap to a cheaper/free provider.
 */
export function paidModelName(): string {
  return process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL
}

/**
 * POST a JSON body with shared rate-limit retry: exponential backoff + jitter
 * (so a burst doesn't resync into the next wall), honoring `Retry-After` when
 * the provider sends it, capped at ~4s. Throws a provider-specific error once
 * the request keeps returning 429.
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
      throw new Error(`network error: ${String(e)}`)
    }
    if (res.status === 429 && attempt < BACKOFF_MS.length) {
      continue
    }
    if (res.status === 429) throw new OpenRouterRateLimitError('OpenRouter rate limited')
    return res
  }
  // Unreachable; keep the type-checker honest.
  throw new Error('fetchWithRetry exhausted')
}

/** Shared prompt text for a human-authored turn (same shape in both callers). */
function humanTurn(text: string, author: string): string {
  return `הודעה מ-${author}:\n${text}`
}

/** Messages array sent to OpenRouter for any reply (stream or not). */
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
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ''}`,
  }
}

/**
 * One-shot bot reply (non-streaming) against the single paid model. Used by the
 * cron / batch `/api/bot` path. Always the paid model — errors surface, never
 * fall through to a free provider.
 */
export async function generateReply(opts: GenerateReplyOptions): Promise<string> {
  const res = await fetchWithRetry(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: paidModelName(),
      messages: buildMessages(opts),
      max_tokens: MAX_TOKENS,
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  return text || FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)]
}

/**
 * Stream the bot reply token-by-token from the paid model (OpenRouter SSE),
 * yielding each content chunk as it arrives. The caller owns converting this to
 * a response stream. Always the paid model only.
 */
export async function* streamReply(opts: GenerateReplyOptions): AsyncGenerator<string> {
  const res = await fetchWithRetry(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: paidModelName(), messages: buildMessages(opts), max_tokens: MAX_TOKENS, stream: true }),
  })
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`)
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