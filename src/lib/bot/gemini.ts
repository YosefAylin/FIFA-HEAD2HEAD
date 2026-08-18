export class GeminiRateLimitError extends Error {}
export class GeminiAuthError extends Error {}

export interface GenerateReplyOptions {
  /** 'gemini' (default, free tier) or 'openrouter' (free models fallback). */
  provider?: 'gemini' | 'openrouter'
  system: string
  author: string
  userText: string
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta'
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const FALLBACK_LINES = [
  'סבבה, טוב לדעת 😎',
  'אחח, עוד פעם הוא? 📣',
  'הוויסקי כבר בדרך לפי הכלל הבלתי כתוב. 🥃',
]

/**
 * Generate a single bot reply via the free Gemini Flash tier (default), or
 * OpenRouter free models when `BOT_PROVIDER=openrouter` / the Gemini key is
 * missing. Pure `fetch` — no SDK.
 */
export async function generateReply(opts: GenerateReplyOptions): Promise<string> {
  const provider = opts.provider ?? process.env.BOT_PROVIDER ?? 'gemini'

  if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
    try {
      return await openRouterReply(opts)
    } catch (e) {
      // Fall through to Gemini if configured; otherwise surface the error.
      if (!process.env.GEMINI_API_KEY) throw e
    }
  }

  return geminiReply(opts)
}

async function geminiReply(opts: GenerateReplyOptions): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

  const body = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: `הודעה מ-${opts.author}:\n${opts.userText}` }],
      },
    ],
    generationConfig: { maxOutputTokens: 300, temperature: 0.9, candidateCount: 1 },
  }

  let res: Response
  try {
    res = await fetch(`${GEMINI_ENDPOINT}/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (e) {
    throw new Error(`Gemini network error: ${String(e)}`)
  }

  // Free-tier rate limits hit often: one 1.5s backoff + single retry.
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500))
    try {
      res = await fetch(`${GEMINI_ENDPOINT}/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
    } catch (e) {
      throw new GeminiRateLimitError(`Gemini retry network error: ${String(e)}`)
    }
    if (res.status === 429) throw new GeminiRateLimitError('Gemini free tier rate limited')
  }

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
  const body = {
    model: process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free',
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: `הודעה מ-${opts.author}:\n${opts.userText}` },
    ],
    max_tokens: 300,
  }
  const res = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  return text || FALLBACK_LINES[Math.floor(Math.random() * FALLBACK_LINES.length)]
}
