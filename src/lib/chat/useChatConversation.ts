'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchChatMessages, sendChatMessage, subscribeToChat } from '@/lib/supabase/chat'
import { hasSupabaseConfig } from '@/lib/supabase/client'
import { clearIdentity, getIdentity, storeIdentity } from '@/lib/chat/identity'
import { useBotStreaming } from '@/lib/bot/useBotStream'
import { BOT_NAME } from '@/lib/bot/constants'
import type { ChatMessage } from '@/lib/types/database'

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
  const [sending, setSending] = useState(false)
  const botStream = useBotStreaming()
  const { streamingText, status: botStatus, onArrived } = botStream

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
      if (msg.author_name === BOT_NAME) onArrived()
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
    if (!text || !identity || sending) return
    setSending(true)
    setError('')
    try {
      await sendChatMessage(identity, text)
      setDraft('')
      // Reflect the just-sent message immediately (and keep the list capped).
      setMessages(cap(await fetchChatMessages()))
      // GPT-style streaming reply from the paid model, then realtime INSERT.
      await botStream.start(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשליחה')
    } finally {
      setSending(false)
    }
  }, [draft, identity, sending, cap, botStream])

  return {
    identity,
    messages,
    draft,
    setDraft,
    error,
    sending,
    streamingText,
    botStatus,
    choose,
    swap,
    send,
  }
}
