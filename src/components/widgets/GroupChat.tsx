'use client'

import { User, MessageCircle, Send } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ROSTER } from '@/lib/data/roster'
import { useChatConversation } from '@/lib/chat/useChatConversation'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { MessageBubble } from '@/components/widgets/MessageBubble'
import { BOT_NAME } from '@/lib/bot/constants'
import { BottomScroll } from '@/components/widgets/BottomScroll'

export function GroupChat() {
  const { nicknameFor } = useRosterSettings()
  const { players } = useTournamentData()
  const {
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
  } = useChatConversation()

  // Identity options come from the live roster so newly-added players and
  // guests can post as themselves; fall back to the static roster when the
  // DB feed is empty (e.g. before Supabase config is present).
  const identityOptions: { id: string; name: string; profile_picture_url: string | null; is_active?: boolean }[] =
    (players.length
      ? players
      : ROSTER.map((r) => ({ id: r.name, name: r.name, profile_picture_url: null, is_active: true }))
    )
      .filter((p) => p.name !== BOT_NAME)
      .slice()
      .sort(
        (a, b) =>
          (a.is_active === false ? 1 : 0) - (b.is_active === false ? 1 : 0) ||
          a.name.localeCompare(b.name)
      )

  // Identity picker: everyone picks who they are, messages appear as them.
  if (!identity) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="flex items-center gap-1.5 text-lg font-bold">
            <User className="h-5 w-5 text-primary" />
            אתח, מי אתה?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            בחרו מי אתם בקבוצה — כל ההודעות שלכם יוצגו תחת השם והאווטאר שבחרתם.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {identityOptions.map((p) => (
            <button
              key={p.id}
              onClick={() => choose(p.name)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/60"
            >
              <Avatar name={p.name} src={p.profile_picture_url} size="lg" />
              <span className="text-sm font-bold">{p.name}</span>
              <span className="text-xs text-muted-foreground">{nicknameFor(p.name)}</span>
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
        <Button variant="ghost" size="sm" onClick={swap} title="הבחירה שלי">
          החלף
        </Button>
      </div>

      <div className="flex max-h-[55vh] min-h-[40vh] flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface p-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-6 w-6 text-muted-foreground/60" />
            <p>עדיין אין הודעות — פתחו את הקובה!</p>
          </div>
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
        {streamingText ? (
          <MessageBubble
            message={{ id: 'streaming', author_name: BOT_NAME, body: streamingText, created_at: new Date().toISOString() }}
            mine={false}
            nickname={null}
            streaming
          />
        ) : null}
        <BottomScroll deps={[messages.length, streamingText]} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {botStatus === 'unavailable' && (
        <p className="text-xs text-muted-foreground">הבוט לא זמין כרגע — יענה מיד 😴</p>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send()
          }}
          placeholder="כתבו הודעה…"
          maxLength={500}
          className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-base transition-all duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button onClick={() => void send()} disabled={sending || !draft.trim()} className="shrink-0">
          {sending ? '…' : (<><Send className="h-4 w-4 rtl:-scale-x-100" />שלח</>)}
        </Button>
      </div>
    </div>
  )
}
