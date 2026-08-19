export class GeminiRateLimitError extends Error {}
export class GeminiAuthError extends Error {}

/** One prior chat turn passed to the model for conversational memory. */
export interface ChatTurn {
  author: string
  text: string
  isBot?: boolean
}

export interface GenerateReplyOptions {
  /** 'gemini' (default, free tier) or 'openrouter' (free models fallback). */
  provider?: 'gemini' | 'openrouter'
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

/** Shared prompt text for a human-authored turn (same shape in both providers). */
function humanTurn(text: string, author: string): string {
  return `הודעה מ-${author}:\n${text}`
}

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

  // Free-tier rate limits hit often: two 1.5s backoffs, then give up.
  for (let attempt = 0; res.status === 429 && attempt < 2; attempt++) {
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
  }
  if (res.status === 429) throw new GeminiRateLimitError('Gemini free tier rate limited')

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
