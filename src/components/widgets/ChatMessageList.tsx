'use client'

import { Fragment } from 'react'
import { Bot, MessageCircle } from 'lucide-react'
import { BottomScroll } from '@/components/widgets/BottomScroll'
import { MessageBubble } from '@/components/widgets/MessageBubble'
import { BOT_NAME } from '@/lib/bot/constants'
import { formatChatDayLabel, getChatDayKey, sameChatGroup } from '@/lib/utils/dateHelpers'
import type { ChatMessage } from '@/lib/types/database'

function DayDivider({ dayKey }: { dayKey: string }) {
  return (
    <div className="my-2 flex justify-center">
      <span className="rounded-full border border-border bg-background/90 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur">
        {formatChatDayLabel(dayKey)}
      </span>
    </div>
  )
}

/** Three-dot "the bot is writing" bubble, shown before the first stream token. */
function TypingBubble() {
  return (
    <div className="mt-2 flex items-end gap-2">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary ring-1 ring-primary/40 shadow-sm"
        title={BOT_NAME}
      >
        <Bot className="h-5 w-5" />
      </span>
      <div className="rounded-2xl border border-primary/50 bg-primary/10 px-3 py-2.5 ring-1 ring-primary/15">
        <span className="flex items-center gap-1" aria-label={`${BOT_NAME} מקליד…`}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        </span>
      </div>
    </div>
  )
}

interface ChatMessageListProps {
  messages: ChatMessage[]
  /** The current device identity — used to align "my" messages. */
  identity: string | null
  nicknameFor: (name: string) => string | null
  /** Live-streamed bot reply, rendered as the last (growing) bubble. */
  streamingText?: string | null
  /** The bot is thinking but hasn't produced its first token yet. */
  typing?: boolean
  emptyText?: string
}

/**
 * WhatsApp-style message list: day dividers ("היום" / "אתמול" / date),
 * consecutive messages from one author collapsed into a single group (no
 * repeated avatar/name), bubble times inside each message, and auto-scroll to
 * the newest line. Shared by the /chat page and the home-page ChatBox.
 */
export function ChatMessageList({
  messages,
  identity,
  nicknameFor,
  streamingText,
  typing = false,
  emptyText = 'עדיין אין הודעות — פתחו את הקובה!',
}: ChatMessageListProps) {
  const hasStreaming = Boolean(streamingText)
  const showTyping = typing && !hasStreaming
  const streamingAt = new Date().toISOString()
  const lastMessage = messages[messages.length - 1]
  const streamingStartsNewDay =
    (hasStreaming || showTyping) &&
    (!lastMessage || getChatDayKey(lastMessage.created_at) !== getChatDayKey(streamingAt))

  if (messages.length === 0 && !hasStreaming && !showTyping) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <MessageCircle className="h-6 w-6 text-muted-foreground/60" />
        <p>{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {messages.map((m, i) => {
        const previous = messages[i - 1]
        const newDay = !previous || getChatDayKey(previous.created_at) !== getChatDayKey(m.created_at)
        const grouped = Boolean(previous && !newDay && sameChatGroup(previous, m))
        return (
          <Fragment key={m.id}>
            {newDay && <DayDivider dayKey={getChatDayKey(m.created_at)} />}
            <MessageBubble
              message={m}
              mine={m.author_name === identity}
              nickname={nicknameFor(m.author_name)}
              showHeader={!grouped}
              showAvatar={!grouped}
              className={grouped ? 'mt-0.5' : i > 0 ? 'mt-2.5' : ''}
            />
          </Fragment>
        )
      })}

      {streamingStartsNewDay && <DayDivider dayKey={getChatDayKey(streamingAt)} />}

      {hasStreaming && (
        <MessageBubble
          message={{
            id: 'streaming',
            author_name: BOT_NAME,
            body: streamingText ?? '',
            created_at: streamingAt,
          }}
          mine={false}
          nickname={null}
          streaming
          className="mt-2.5"
        />
      )}

      {showTyping && <TypingBubble />}

      <BottomScroll
        deps={[messages.length, messages[messages.length - 1]?.id, streamingText ?? '', showTyping]}
      />
    </div>
  )
}
