'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { getIdentity } from '@/lib/chat/identity'
import { fetchChatMessages, sendChatMessage, subscribeToChat } from '@/lib/supabase/chat'
import { hasSupabaseConfig } from '@/lib/supabase/client'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import { MessageBubble } from '@/components/widgets/MessageBubble'
import { BOT_NAME } from '@/lib/bot/constants'
import { pingBotNow } from '@/lib/bot/ping'
import type { ChatMessage } from '@/lib/types/database'

/**
 * Compact home-page chat box — same `chat_messages` table, same identity and
 * realtime wiring as the /chat page, so messages posted here appear there and
 * vice-versa (including the AI bot's replies).
 */
export function ChatBox() {
  const { nicknameFor } = useRosterSettings()
  const [identity, setIdentity] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [botStatus, setBotStatus] = useState<'idle' | 'typing' | 'unavailable'>('idle')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIdentity(getIdentity())
    if (!hasSupabaseConfig()) return
    void (async () => {
      try {
        setMessages((await fetchChatMessages()).slice(-20))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'שגיאה בטעינת הצ׳אט')
      }
    })()
    const unsub = subscribeToChat((msg) => {
      if (msg.author_name === BOT_NAME) setBotStatus('idle') // a bot reply arrived — done
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg].slice(-20)
      })
    })
    return unsub
  }, [])

  // Autoscroll to newest.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  async function handleSend() {
    const text = draft.trim()
    if (!text || !identity || sending) return
    setSending(true)
    setError('')
    setBotStatus('typing') // bot may start writing
    try {
      await sendChatMessage(identity, text)
      setDraft('')
      const woke = await pingBotNow() // wake the AI bot for an immediate reply
      if (!woke) setBotStatus('unavailable')
      else {
        // If no bot reply lands in ~20s, treat the wake as a dead end.
        setTimeout(() => {
          setBotStatus((s) => (s === 'typing' ? 'unavailable' : s))
        }, 20000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשליחה')
      setBotStatus('idle')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-[20px] border border-lines bg-surface p-3 sm:p-4">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
            דברו עם {BOT_NAME} <span aria-hidden>🤖</span>
          </h3>
          <p className="text-xs text-ink-mid">
            שאלו אותו מי מוביל, מי בצורת שערים — הבוט עונה מהטבלה האמיתית.
          </p>
        </div>
        {identity && (
          <span className="shrink-0 text-xs text-ink-mid">
            {identity} ·{' '}
            <a href="/chat" className="text-gold underline underline-offset-2 hover:text-gold-deep">
              לפתוח במלואו
            </a>
          </span>
        )}
      </header>

      <div
        ref={listRef}
        className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-2xl border border-lines bg-pitch/60 p-2"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-mid">
            עדיין אין הודעות — פתחו את הקובה! 💬
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.author_name === identity}
              nickname={nicknameFor(m.author_name)}
            />
          ))
        )}
      </div>

      {error && <p className="mt-2 text-xs text-loss">{error}</p>}

      {botStatus !== 'idle' && (
        <p className={`mt-2 text-xs ${botStatus === 'typing' ? 'bot-line-in text-ink-mid' : 'text-ink-faint'}`}>
          {botStatus === 'typing' ? 'הבוט כותב… ✍️' : 'הבוט לא זמין כרגע 😴'}
        </p>
      )}

      {identity ? (
        <div className="mt-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSend()
            }}
            placeholder="כתבו הודעה…"
            maxLength={500}
            className="min-w-0 flex-1 rounded-xl border border-lines bg-raised/50 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
          />
          <Button onClick={() => void handleSend()} disabled={sending || !draft.trim()} size="sm" className="shrink-0">
            {sending ? '…' : 'שלח'}
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-center text-xs text-ink-mid">
          <a href="/chat" className="text-gold underline underline-offset-2 hover:text-gold-deep">
            בחרו את השם שלכם
          </a>{' '}
          כדי להצטרף לצ׳אט.
        </p>
      )}
    </section>
  )
}