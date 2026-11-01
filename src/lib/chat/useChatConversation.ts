'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchChatMessages, sendChatMessage, subscribeToChat } from '@/lib/supabase/chat'
import { hasSupabaseConfig } from '@/lib/supabase/client'
import { clearIdentity, getIdentity, storeIdentity } from '@/lib/chat/identity'
import { useBotStreaming } from '@/lib/bot/useBotStream'
import { pingBotNow } from '@/lib/bot/ping'
import { BOT_NAME, BOT_ERROR_MESSAGE } from '@/lib/bot/constants'
import type { ChatMessage } from '@/lib/types/database'

/** Retry gaps for the catch-up wake (covers a stream or batch tick holding the lock). */
const WAKE_DELAYS_MS = [2500, 5000, 10000, 20000]

/** One catch-up loop at a time — a burst of sends must not stack wake calls. */
let wakeInFlight = false

/**
 * Ask the batch route to answer any human messages the stream didn't cover
 * (messages that landed while the bot was typing, or a stream that was busy /
 * dropped). Retries while another tick holds the lock, then gives up — the next
 * message or daily sweep is the final catch-up. Returns whether a wake was
 * accepted (so the caller knows an answer is coming).
 */
async function wakeBotWithRetry(attempt = 0): Promise<boolean> {
  // Another loop is already retrying; it will pick up the same messages.
  if (wakeInFlight) return true
  wakeInFlight = true
  let ok = false
  let retry = false
  try {
    ok = await pingBotNow()
    retry = !ok && attempt < WAKE_DELAYS_MS.length
    if (retry) await new Promise((r) => setTimeout(r, WAKE_DELAYS_MS[attempt]))
  } finally {
    wakeInFlight = false
  }
  if (ok) return true
  if (!retry) return false
  return wakeBotWithRetry(attempt + 1)
}

/**
 * Shared chat conversation state for the home `ChatBox` and the full
 * `/chat` `GroupChat`: identity read/choose, realtime messages, the send +
 * GPT-style streaming flow, and the streaming placeholder. `limit` caps the
 * in-memory message list (the home box keeps the last 20; /chat keeps all).
 */
export function useChatConversation({ limit }: { limit?: number } = {}) {
  const [identity, setIdentity] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [botError, setBotError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const botStream = useBotStreaming()
  const { streamingText, status: botStatus, onArrived } = botStream
  // Synchronous re-entry guard: the `sending` state lagged behind Enter spam,
  // so two keys in the same tick could double-insert.
  const sendingRef = useRef(false)
  const wakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Debounce catch-up wakes so a rapid burst produces one wake loop, not N. */
  const scheduleWake = useCallback(() => {
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
    wakeTimerRef.current = setTimeout(() => {
      wakeTimerRef.current = null
      void wakeBotWithRetry()
    }, 1200)
  }, [])

  useEffect(
    () => () => {
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
    },
    []
  )

  const cap = useCallback(
    (list: ChatMessage[]) => (limit && list.length > limit ? list.slice(-limit) : list),
    [limit]
  )

  const loadAll = useCallback(async () => {
    try {
      setMessages(cap(await fetchChatMessages()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הצ׳אט')
    }
  }, [cap])

  useEffect(() => {
    setIdentity(getIdentity())
    if (!hasSupabaseConfig()) return
    void loadAll()
    const unsub = subscribeToChat((msg) => {
      if (msg.author_name === BOT_NAME) {
        onArrived()
        // Any real bot line means the error state is stale.
        setBotError(null)
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return cap([...prev, msg])
      })
    })
    return unsub
  }, [loadAll, cap, onArrived])

  const choose = useCallback((name: string) => {
    storeIdentity(name)
    setIdentity(name)
  }, [])

  const swap = useCallback(() => {
    clearIdentity()
    setIdentity(null)
  }, [])

  const send = useCallback(async () => {
    const text = draft.trim()
    if (!text || !identity || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setError('')
    setBotError(null)
    try {
      await sendChatMessage(identity, text)
      setDraft('')
      // Reflect the just-sent message immediately (and keep the list capped).
      setMessages(cap(await fetchChatMessages()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשליחה')
      return
    } finally {
      sendingRef.current = false
      setSending(false)
    }
    // The bot reply runs in the background so quick follow-up messages can be
    // sent immediately. If another stream is already typing, `start` returns
    // `ok: false` and the scheduled wake covers the remaining burst instead.
    void (async () => {
      const result = await botStream.start(text)
      if (result.errored) {
        // The server discarded the reply (leak/empty) and posted nothing.
        setBotError(BOT_ERROR_MESSAGE)
        return
      }
      if (result.ok) {
        scheduleWake()
        return
      }
      // Busy / unavailable / dropped: let the batch route answer. Only show the
      // canned error when it couldn't even accept the work.
      if (!(await wakeBotWithRetry())) setBotError(BOT_ERROR_MESSAGE)
    })()
  }, [draft, identity, cap, botStream, scheduleWake])

  return {
    identity,
    messages,
    draft,
    setDraft,
    error,
    botError,
    sending,
    streamingText,
    botStatus,
    choose,
    swap,
    send,
  }
}
