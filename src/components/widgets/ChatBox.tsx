'use client'

import Link from 'next/link'
import { Bot, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useChatConversation } from '@/lib/chat/useChatConversation'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import { ChatMessageList } from '@/components/widgets/ChatMessageList'
import { BOT_NAME } from '@/lib/bot/constants'

/**
 * Compact home-page chat box — same `chat_messages` table, same identity and
 * realtime wiring as the /chat page, so messages posted here appear here and
 * vice-versa (including the AI bot's replies).
 */
export function ChatBox() {
  const { nicknameFor } = useRosterSettings()
  const {
    identity,
    messages,
    draft,
    setDraft,
    error,
    botError,
    sending,
    streamingText,
    botStatus,
    send,
  } = useChatConversation({ limit: 20 })

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Bot className="h-4 w-4 text-primary" />
            דברו עם {BOT_NAME}
          </h3>
          <p className="text-xs text-muted-foreground">
            שאלו אותו מי מוביל, מי בצורת שערים — הבוט עונה מהטבלה האמיתית.
          </p>
        </div>
        {identity && (
          <span className="text-xs text-muted-foreground">
            {identity} ·{' '}
            <Link href="/chat" className="text-primary underline underline-offset-2">
              לפתוח במלואו
            </Link>
          </span>
        )}
      </div>

      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-background p-2">
        <ChatMessageList
          messages={messages}
          identity={identity}
          nicknameFor={nicknameFor}
          streamingText={streamingText}
          typing={botStatus === 'typing'}
        />
        {botError ? (
          <div className="flex justify-center py-1">
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs font-medium text-destructive">
              {botError}
            </p>
          </div>
        ) : null}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {botStatus === 'unavailable' && !botError && (
        <p className="text-xs text-muted-foreground">הבוט לא זמין כרגע — יענה מיד 😴</p>
      )}

      {identity ? (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send()
            }}
            placeholder="כתבו הודעה…"
            maxLength={500}
            enterKeyHint="send"
            aria-label="הודעת צ׳אט"
            className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm transition-all duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={() => void send()} disabled={sending || !draft.trim()} size="sm" className="shrink-0">
            {sending ? '…' : (<><Send className="h-4 w-4 rtl:-scale-x-100" />שלח</>)}
          </Button>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/chat" className="text-primary underline underline-offset-2">
            בחרו את השם שלכם
          </Link>{' '}
          כדי להצטרף לצ׳אט.
        </p>
      )}
    </div>
  )
}
