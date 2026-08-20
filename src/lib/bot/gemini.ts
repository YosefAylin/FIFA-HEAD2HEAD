export class GeminiRateLimitError extends Error {}
export class GeminiAuthError extends Error {}
export class OpenRouterRateLimitError extends Error {}

/** One prior chat turn passed to the model for conversational memory. */
export interface ChatTurn {
  author: string
  text: string
  isBot?: boolean
}

export interface GenerateReplyOptions {
  /** 'openrouter' (default, free tier) or 'gemini' (fallback). */
  provider?: 'openrouter' | 'gemini'
  system: string
  author: string
  userText: string
  /** Prior turns (oldest first) — the bot replies with this context in mind. */
  history?: ChatTurn[]
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
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
 * POST a JSON body with shared rate-limit retry: exponential backoff + jitter
 * (so a burst doesn't resync into the next wall), honoring `Retry-After` when
 * the provider sends it, capped at ~4s. Throws a provider-specific error once
 * the request keeps returning 429.
 */
async function fetchWithRetry(
  url: string,
  opts: { method: string; headers: Record<string, string>; body: string },
  onRateLimited: (status: number, retryAfter?: string | null) => Error
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
    if (res.status === 429) throw onRateLimited(res.status, res.headers.get('retry-after'))
    return res
  }
  // Unreachable; keep the type-checker honest.
  throw new Error('fetchWithRetry exhausted')
}

/** Shared prompt text for a human-authored turn (same shape in both providers). */
function humanTurn(text: string, author: string): string {
  return `הודעה מ-${author}:\n${text}`
}

/**
 * Generate a single bot reply. `BOT_PROVIDER` picks the primary:
 *  - `openrouter` (default): OpenRouter free model first, Gemini fallback.
 *  - `gemini`: Gemini first, OpenRouter fallback.
 * Each side falls through to the other when it fails, so a dead free tier or a
 * missing key never silently kills a reply. Pure `fetch` — no SDK.
 */
export async function generateReply(opts: GenerateReplyOptions): Promise<string> {
  const provider = opts.provider ?? process.env.BOT_PROVIDER ?? 'openrouter'

  if (provider === 'openrouter') {
    try {
      return await openRouterReply(opts)
    } catch (e) {
      // OpenRouter failed → fall back to Gemini whenever it has a key.
      if (e instanceof OpenRouterRateLimitError && !process.env.GEMINI_API_KEY) throw e
      if (process.env.GEMINI_API_KEY) {
        try {
          return await geminiReply(opts)
        } catch {
          throw e
        }
      }
      throw e
    }
  }

  try {
    return await geminiReply(opts)
  } catch (e) {
    // Gemini failed → fall back to OpenRouter whenever it has a key.
    if (process.env.OPENROUTER_API_KEY) {
      try {
        return await openRouterReply(opts)
      } catch {
        throw e
      }
    }
    throw e
  }
}

async function geminiReply(opts: GenerateReplyOptions): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

  const contents = (opts.history ?? []).map((t) => ({
    role: t.isBot ? 'model' : 'user',
    parts: [{ text: t.isBot ? t.text : humanTurn(t.text, t.author) }],
  }))
  contents.push({ role: 'user', parts: [{ text: humanTurn(opts.userText, opts.author) }] })

  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents,
    generationConfig: { maxOutputTokens: 800, temperature: 0.9, candidateCount: 1 },
  }

  const url = `${GEMINI_ENDPOINT}/models/${model}:generateContent?key=${key}`
  const res = await fetchWithRetry(
    url,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    (_status, retryAfter) =>
      new GeminiRateLimitError(`Gemini free tier rate limited${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`)
  )

  if (res.status === 403) {
    throw new GeminiAuthError('Gemini API key invalid or model disabled')
  }
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}`)
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return text || FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)]
}

async function openRouterReply(opts: GenerateReplyOptions): Promise<string> {
  const history: { role: string; content: string }[] = (opts.history ?? []).map((t) => ({
    role: t.isBot ? 'assistant' : 'user',
    content: t.isBot ? t.text : humanTurn(t.text, t.author),
  }))
  const body = {
    model: process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free',
    messages: [
      { role: 'system', content: opts.system },
      ...history,
      { role: 'user', content: humanTurn(opts.userText, opts.author) },
    ],
    max_tokens: 800,
  }

  const res = await fetchWithRetry(
    OPENROUTER_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify(body),
    },
    (_status, retryAfter) =>
      new OpenRouterRateLimitError(`OpenRouter free tier rate limited${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`)
  )

  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  return text || FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)]
}