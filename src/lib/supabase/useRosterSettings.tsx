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
import { useToast } from '@/components/ui/Toast'

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
      // Legacy bot lines were stored with author 'bot' — normalize to BOT_NAME so
      // the BotTalk chip still attributes them (see 5644990, which changed the
      // display gate but left already-stored 'bot' authors in place).
      const author = typeof o.author === 'string' ? o.author : ''
      return [{ text: o.text.trim(), author: author === 'bot' ? BOT_NAME : author }]
    }
    return []
  })
}

export function RosterSettingsProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
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
      } else if (row.key === 'bot_regen_event' && row.value && typeof row.value === 'object') {
        // Only the manual "רענן הכל" route writes this marker, so this toast
        // fires ON MANUAL REGEN (not the daily sweep). Show the change counts,
        // plus a short preview of the freshly-written bot banter lines so the
        // notification actually shows what changed.
        const v = row.value as { jabs?: number; banter?: number; newLines?: string[] }
        const jabs = typeof v.jabs === 'number' ? v.jabs : 0
        const banter = typeof v.banter === 'number' ? v.banter : 0
        const preview = Array.isArray(v.newLines) ? v.newLines.slice(0, 2).join(' · ') : ''
        toast({
          title: 'רענון חכם',
          message: preview
            ? `עודכנו ${jabs} עקיצות ו-${banter} שורות באנטר — חדש: ${preview}`
            : `עודכנו ${jabs} עקיצות ו-${banter} שורות באנטר`,
          kind: 'accent',
        })
      }
    })
    return () => {
      controller.abort()
      unsub()
    }
  }, [refresh, toast])

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

  // The rotation pool blends the three line types the card shuffles between:
  //  1. the live, data-grounded card line,
  //  2. per-player jabs (override → live → roster), and
  //  3. the banter pool (built-in roster lines + user-added sentences).
  // Grouped so random rotation samples all three kinds evenly (BotTalk picks a
  // random index rather than iterating a fixed sequence).
  const sentences = useMemo(
    () => {
      const pool: BanterLine[] = []
      // 1) Live, data-grounded card line leads — generated from the real
      // table/stats/recent chat on every load, so the featured line is fresh.
      if (live.line) {
        // Prefer only valid Hebrew from the live generator; else skip it.
        const t = live.line.trim()
        if (t && /[֐-׿ﬠ-ﭏ]/.test(t)) pool.push({ text: t, author: BOT_NAME })
      }
      // 2) One line per player jab — resolved override→live→roster, keyed by
      // name so a player never appears twice even when both stores carry them.
      const jabByPlayer: Record<string, string> = {}
      for (const [name, ov] of Object.entries(overrides)) {
        const j = ov?.jab?.trim()
        if (j) jabByPlayer[name] = j
      }
      for (const [name, j] of Object.entries(live.jabs ?? {})) {
        const t = j?.trim()
        if (t && !(name in jabByPlayer)) jabByPlayer[name] = t
      }
      for (const [name, jab] of Object.entries(jabByPlayer)) {
        pool.push({ text: jab, author: name })
      }
      // 3) Banter: built-in roster lines then user-added sentences, grouped by
      // type so random picks hit both rather than exhausting one before the other.
      for (const line of BANTER_PHRASES) pool.push(line)
      for (const line of userSentences) pool.push(line)
      return pool
    },
    [live.line, live.jabs, overrides, userSentences]
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
