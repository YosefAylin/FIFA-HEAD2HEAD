'use client'

import { Bot, Check, Sparkles } from 'lucide-react'
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

function formatFullTimestamp(iso: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

interface MessageBubbleProps {
  message: ChatMessage
  /** Whether this message was sent by the current device's identity. */
  mine: boolean
  /** The roster nickname for the author (overrides-aware), if any. */
  nickname: string | null
  /** Show a blinking caret — used for the GPT-style living streamed reply. */
  streaming?: boolean
  /** Hide the author line for consecutive messages from the same person. */
  showHeader?: boolean
  /** Hide the avatar for consecutive messages from the same person. */
  showAvatar?: boolean
  className?: string
}

/**
 * Single chat message row — shared by the /chat page (GroupChat) and the
 * home-page ChatBox so bot + human messages look consistent everywhere.
 *
 * Bubbles mirror WhatsApp in RTL: your messages sit on the far side
 * (left), everyone else's with an avatar on the right, the AI reply is
 * gold-tinted and bold so it stands apart from group chatter, and the time
 * sits inside the bubble (with a sent tick for your own messages).
 */
export function MessageBubble({
  message,
  mine,
  nickname,
  streaming = false,
  showHeader = true,
  showAvatar = true,
  className = '',
}: MessageBubbleProps) {
  const isBot = message.author_name === BOT_NAME

  return (
    <div
      className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${className}`}
    >
      {!mine &&
        (showAvatar ? (
          isBot ? (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary ring-1 ring-primary/40 shadow-sm"
              title={BOT_NAME}
            >
              <Bot className="h-5 w-5" />
            </span>
          ) : (
            <Avatar name={message.author_name} size="sm" />
          )
        ) : (
          <span className="h-9 w-9 shrink-0" aria-hidden />
        ))}

      <div className="flex min-w-0 max-w-[78%] flex-col items-start">
        {showHeader && (
          <div className="mb-0.5 flex items-center gap-1.5 px-1">
            <span
              className={`text-xs ${
                isBot ? 'font-extrabold text-primary' : 'font-bold text-foreground/80'
              }`}
            >
              {message.author_name}
            </span>
            {isBot && (
              <span className="flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-extrabold text-primary">
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                AI
              </span>
            )}
            {nickname && (
              <span className="text-[10px] text-muted-foreground">{nickname}</span>
            )}
            {streaming && (
              <span className="text-[10px] font-medium text-primary/80">מקליד…</span>
            )}
          </div>
        )}

        <div
          className={`min-w-0 max-w-full rounded-2xl border px-3 py-1.5 shadow-sm ${
            isBot
              ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/15'
              : mine
                ? 'border-primary/35 bg-primary/15'
                : 'border-border bg-background'
          }`}
        >
          <p
            className={`mt-0.5 text-sm whitespace-pre-wrap break-words leading-relaxed ${
              isBot ? 'font-semibold text-foreground' : ''
            }`}
          >
            {message.body}
            {streaming && (
              <span className="inline-block h-3 w-0.5 animate-pulse rounded bg-primary align-middle" />
            )}
          </p>
          <div
            className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] leading-none ${
              isBot ? 'text-primary/70' : 'text-muted-foreground'
            }`}
          >
            <time dateTime={message.created_at} title={formatFullTimestamp(message.created_at)}>
              {formatTime(message.created_at)}
            </time>
            {mine && !streaming && (
              <Check className="h-3 w-3" aria-label="נשלח" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
