'use client'

import { Avatar } from '@/components/ui/Avatar'
import { BOT_NAME } from '@/lib/bot/constants'
import type { ChatMessage } from '@/lib/types/database'

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

interface MessageBubbleProps {
  message: ChatMessage
  /** Whether this message was sent by the current device's identity. */
  mine: boolean
  /** The roster nickname for the author (overrides-aware), if any. */
  nickname: string | null
}

/**
 * Single chat message row — shared by the /chat page (GroupChat) and the
 * home-page ChatBox so bot + human messages look consistent everywhere.
 */
export function MessageBubble({ message, mine, nickname }: MessageBubbleProps) {
  const isBot = message.author_name === BOT_NAME
  return (
    <div className={`flex items-start gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
      {isBot ? (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-base ring-2 ring-gold/25"
          title={BOT_NAME}
        >
          🤖
        </span>
      ) : (
        <Avatar name={message.author_name} size="sm" />
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 ${
          mine ? 'bg-gold/12 ring-1 ring-gold/25' : 'bg-raised/60 ring-1 ring-lines'
        }`}
      >
        <div className="flex items-baseline gap-2">
          <span className={`text-xs font-bold ${isBot ? 'text-gold' : 'text-ink'}`}>{message.author_name}</span>
          {nickname && <span className="text-[10px] text-ink-faint">{nickname}</span>}
          <span className="text-[10px] text-ink-faint">{formatTime(message.created_at)}</span>
        </div>
        <p className="mt-0.5 text-sm text-ink/90 whitespace-pre-wrap">{message.body}</p>
      </div>
    </div>
  )
}