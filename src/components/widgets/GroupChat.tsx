'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ROSTER } from '@/lib/data/roster'
import { fetchChatMessages, sendChatMessage, subscribeToChat } from '@/lib/supabase/chat'
import { hasSupabaseConfig } from '@/lib/supabase/client'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import type { ChatMessage } from '@/lib/types/database'

const IDENTITY_KEY = 'fifa-chat-identity'

function storedIdentity(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(IDENTITY_KEY)
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function GroupChat() {
  const { nicknameFor } = useRosterSettings()
  const [identity, setIdentity] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const loadAll = useCallback(async () => {
    try {
      setMessages(await fetchChatMessages())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינת הצ׳אט')
    }
  }, [])

  // Identity (persisted per device).
  useEffect(() => {
    setIdentity(storedIdentity())
    if (!hasSupabaseConfig()) return
    void loadAll()
    const unsub = subscribeToChat((msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })
    return unsub
  }, [loadAll])

  // Autoscroll to newest.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  function choose(name: string) {
    window.localStorage.setItem(IDENTITY_KEY, name)
    setIdentity(name)
  }

  async function handleSend() {
    const text = draft.trim()
    if (!text || !identity || sending) return
    setSending(true)
    setError('')
    try {
      await sendChatMessage(identity, text)
      setDraft('')
      setMessages(await fetchChatMessages())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשליחה')
    } finally {
      setSending(false)
    }
  }

  // Identity picker: everyone picks who they are, messages appear as them.
  if (!identity) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-lg font-bold">אתח, מי אתה? 👤</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            בחרו מיהו יושבם בקבוצה — כל ההודעות שלכן יוצגו תחת השם והאווטאר שבחרתם.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ROSTER.map((r) => (
            <button
              key={r.name}
              onClick={() => choose(r.name)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/60"
            >
              <Avatar name={r.name} size="lg" />
              <span className="text-sm font-bold">{r.name}</span>
              <span className="text-xs text-muted-foreground">{nicknameFor(r.name)}</span>
            </button>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  const me = nicknameFor(identity)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3">
        <div className="flex items-center gap-2">
          <Avatar name={identity} size="sm" />
          <span>
            <span className="text-sm font-bold">{identity}</span>
            {me && <span className="text-xs text-muted-foreground"> · {me}</span>}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { window.localStorage.removeItem(IDENTITY_KEY); setIdentity(null) }} title="הבחירה שלי">
          החלף
        </Button>
      </div>

      <div
        ref={listRef}
        className="flex max-h-[55vh] min-h-[40vh] flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface p-3"
      >
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            עדיין אין הודעות — פתחו את הקובה! 💬
          </p>
        ) : (
          messages.map((m) => {
            const sender = nicknameFor(m.author_name)
            return (
              <div
                key={m.id}
                className={`flex items-start gap-2 ${m.author_name === identity ? 'flex-row-reverse' : ''}`}
              >
                <Avatar name={m.author_name} size="sm" />
                <div
                  className={`max-w-[75%] rounded-2xl border px-3 py-2 ${
                    m.author_name === identity
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold">{m.author_name}</span>
                    {sender && <span className="text-[10px] text-muted-foreground">{sender}</span>}
                    <span className="text-[10px] text-muted-foreground">{formatTime(m.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSend()
          }}
          placeholder="כתבו הודעה…"
          maxLength={500}
          className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button onClick={() => void handleSend()} disabled={sending || !draft.trim()} className="shrink-0">
          {sending ? '…' : 'שלח'}
        </Button>
      </div>
    </div>
  )
}