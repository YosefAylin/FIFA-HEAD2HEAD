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
import { rosterFor } from '@/lib/data/roster'
import { hasSupabaseConfig } from '@/lib/supabase/client'
import { fetchSetting, subscribeToSettingChange, upsertSetting } from '@/lib/supabase/settings'
import { BANTER_PHRASES } from '@/lib/supabase/stats'

export interface RosterSettings {
  ready: boolean
  nicknameFor: (name: string) => string
  jabFor: (name: string) => string
  /** Base pool + user-added sentences. */
  sentences: string[]
  userSentences: string[]
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

export function RosterSettingsProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({})
  const [userSentences, setUserSentences] = useState<string[]>([])
  const [systemPrompt, setSystemPromptState] = useState('')
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
      if (Array.isArray(sn)) setUserSentences(sn as unknown as string[])
      if (sp && typeof sp === 'object' && typeof sp.text === 'string') setSystemPromptState(sp.text)
    } catch {
      // settings table missing → keep defaults (nicknames + built-in sentences)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
    if (!hasSupabaseConfig()) return
    const unsub = subscribeToSettingChange((row) => {
      if (row.key === OVERRIDES_KEY && row.value && typeof row.value === 'object') {
        setOverrides(row.value as Overrides)
      } else if (row.key === SENTENCES_KEY && Array.isArray(row.value)) {
        setUserSentences(row.value as unknown as string[])
      } else if (row.key === SYSTEM_PROMPT_KEY && row.value && typeof row.value === 'object') {
        const v = row.value as { text?: unknown }
        setSystemPromptState(typeof v.text === 'string' ? v.text : '')
      }
    })
    return unsub
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
      const ov = overrides[name]?.jab?.trim()
      if (ov) return ov
      return rosterFor(name)?.jab ?? DEFAULT_JAB
    },
    [overrides]
  )

  const sentences = useMemo(() => [...BANTER_PHRASES, ...userSentences], [userSentences])

  const persistOverrides = useCallback(async (next: Overrides) => {
    try {
      await upsertSetting(OVERRIDES_KEY, next)
    } catch {
      // settings table missing → reflect in memory only
    }
  }, [])

  const persistSentences = useCallback(async (next: string[]) => {
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
      setUserSentences((prev) => {
        const next = [...prev, text.trim()]
        void persistSentences(next)
        return next
      })
    },
    [persistSentences]
  )

  const removeSentence = useCallback(
    async (text: string) => {
      setUserSentences((prev) => {
        const next = prev.filter((s) => s !== text)
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
