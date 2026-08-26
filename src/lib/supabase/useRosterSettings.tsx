'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { rosterFor, type BanterLine } from '@/lib/data/roster'
import { hasSupabaseConfig } from '@/lib/supabase/client'
import { fetchSetting, subscribeToSettingChange, upsertSetting } from '@/lib/supabase/settings'
import { BANTER_PHRASES } from '@/lib/supabase/stats'
import { BOT_NAME } from '@/lib/bot/constants'
import { getIdentity } from '@/lib/chat/identity'

/** Live, data-grounded banter pulled per page load (card line + per-player jabs). */
interface LiveBanter {
  line: string
  jabs: Record<string, string>
}

export interface RosterSettings {
  ready: boolean
  nicknameFor: (name: string) => string
  jabFor: (name: string) => string
  /** Authored per-member lines + user-added sentences (with writer attribution). */
  sentences: BanterLine[]
  userSentences: BanterLine[]
  /** Editable bot system prompt header ('' = built-in default). */
  systemPrompt: string
  setSystemPrompt: (text: string) => Promise<void>
  updateRoster: (name: string, patch: { nickname?: string; jab?: string }) => Promise<void>
  addSentence: (text: string) => Promise<void>
  removeSentence: (text: string) => Promise<void>
}

const Ctx = createContext<RosterSettings | null>(null)

const OVERRIDES_KEY = 'roster_overrides'
const SENTENCES_KEY = 'fun_sentences'
const SYSTEM_PROMPT_KEY = 'bot_system_prompt'
const DEFAULT_JAB = 'חדש בקבוצה — בינתיים רק חטיפים.'

type Overrides = Record<string, { nickname?: string; jab?: string }>

/** Coerce a stored `fun_sentences` value (legacy strings or {text,author}) to lines. */
function toBanterLines(value: unknown): BanterLine[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((x): BanterLine[] => {
    if (typeof x === 'string' && x.trim()) return [{ text: x.trim(), author: '' }]
    if (x && typeof x === 'object' && typeof (x as { text?: unknown }).text === 'string') {
      const o = x as { text: string; author?: unknown }
      return [{ text: o.text.trim(), author: typeof o.author === 'string' ? o.author : '' }]
    }
    return []
  })
}

export function RosterSettingsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({})
  const [userSentences, setUserSentences] = useState<BanterLine[]>([])
  const [systemPrompt, setSystemPromptState] = useState('')
  const [live, setLive] = useState<LiveBanter>({ line: '', jabs: {} })
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!hasSupabaseConfig()) {
      setReady(true)
      return
    }
    try {
      const ov = await fetchSetting(OVERRIDES_KEY)
      const sn = await fetchSetting(SENTENCES_KEY)
      const sp = await fetchSetting(SYSTEM_PROMPT_KEY)
      if (ov && typeof ov === 'object') setOverrides(ov as Overrides)
      setUserSentences(toBanterLines(sn))
      if (sp && typeof sp === 'object' && typeof sp.text === 'string') setSystemPromptState(sp.text)
    } catch {
      // settings table missing → keep defaults (nicknames + built-in sentences)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
    // Live on every load: pull the data-grounded card line + jabs once per mount.
    // The server caches by digest signature (short TTL), so repeated loads reuse
    // the last generation until the underlying data actually changes.
    const controller = new AbortController()
    fetch('/api/bot/live', { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<LiveBanter>) : null))
      .then((b) => {
        if (b) setLive(b)
      })
      .catch(() => {
        /* offline / no key → keep the built-in sentences */
      })
    const cleanup = () => controller.abort()
    if (!hasSupabaseConfig()) return cleanup
    const unsub = subscribeToSettingChange((row) => {
      if (row.key === OVERRIDES_KEY && row.value && typeof row.value === 'object') {
        setOverrides(row.value as Overrides)
      } else if (row.key === SENTENCES_KEY) {
        setUserSentences(toBanterLines(row.value))
      } else if (row.key === SYSTEM_PROMPT_KEY && row.value && typeof row.value === 'object') {
        const v = row.value as { text?: unknown }
        setSystemPromptState(typeof v.text === 'string' ? v.text : '')
      }
    })
    return () => {
      controller.abort()
      unsub()
    }
  }, [refresh])

  const nicknameFor = useCallback(
    (name: string) => {
      const ov = overrides[name]?.nickname?.trim()
      if (ov) return ov
      return rosterFor(name)?.nickname ?? ''
    },
    [overrides]
  )

  const jabFor = useCallback(
    (name: string) => {
      // A deliberate human override is always preserved; otherwise fall through
      // to the live (data-grounded) jab, the static roster jab, then the default.
      const ov = overrides[name]?.jab?.trim()
      if (ov) return ov
      const lj = live.jabs[name]?.trim()
      if (lj) return lj
      return rosterFor(name)?.jab ?? DEFAULT_JAB
    },
    [live, overrides]
  )

  // Interleave authored lines with user-added sentences so the sequential
  // refresh rotation surfaces both pools regularly (rather than exhausting all
  // the built-in lines before touching a user sentence).
  const sentences = useMemo(
    () => {
      const pool: BanterLine[] = []
      // The live, data-grounded card line leads every cycle — it changes with
      // the table, so the on-screen sentence finally moves.
      if (live.line) pool.push({ text: live.line, author: BOT_NAME })
      const max = Math.max(BANTER_PHRASES.length, userSentences.length)
      for (let i = 0; i < max; i++) {
        if (BANTER_PHRASES[i]) pool.push(BANTER_PHRASES[i])
        if (userSentences[i]) pool.push(userSentences[i])
      }
      return pool
    },
    [live.line, userSentences]
  )

  const persistOverrides = useCallback(async (next: Overrides) => {
    try {
      await upsertSetting(OVERRIDES_KEY, next)
    } catch {
      // settings table missing → reflect in memory only
    }
  }, [])

  const persistSentences = useCallback(async (next: BanterLine[]) => {
    try {
      await upsertSetting(SENTENCES_KEY, next)
    } catch {
      // settings table missing → reflect in memory only
    }
  }, [])

  const updateRoster = useCallback(
    async (name: string, patch: { nickname?: string; jab?: string }) => {
      setOverrides((prev) => {
        const next = { ...prev, [name]: { ...prev[name], ...patch } }
        void persistOverrides(next)
        return next
      })
    },
    [persistOverrides]
  )

  const addSentence = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const author = getIdentity() ?? ''
      setUserSentences((prev) => {
        const next = [...prev, { text: trimmed, author }]
        void persistSentences(next)
        return next
      })
    },
    [persistSentences]
  )

  const removeSentence = useCallback(
    async (text: string) => {
      setUserSentences((prev) => {
        const next = prev.filter((s) => s.text !== text)
        void persistSentences(next)
        return next
      })
    },
    [persistSentences]
  )

  const setSystemPrompt = useCallback(async (text: string) => {
    setSystemPromptState(text)
    try {
      await upsertSetting(SYSTEM_PROMPT_KEY, { text })
    } catch {
      // settings table missing → reflect in memory only
    }
  }, [])

  const value = useMemo<RosterSettings>(
    () => ({
      ready,
      nicknameFor,
      jabFor,
      sentences,
      userSentences,
      systemPrompt,
      setSystemPrompt,
      updateRoster,
      addSentence,
      removeSentence,
    }),
    [
      ready,
      nicknameFor,
      jabFor,
      sentences,
      userSentences,
      systemPrompt,
      setSystemPrompt,
      updateRoster,
      addSentence,
      removeSentence,
    ]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRosterSettings(): RosterSettings {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useRosterSettings must be used inside <RosterSettingsProvider>')
  return ctx
}
