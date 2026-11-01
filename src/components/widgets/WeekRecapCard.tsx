'use client'

import { useState } from 'react'
import { Check, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TieNames } from '@/components/widgets/TieNames'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { buildRecapShareText, computeWeekRecap } from '@/lib/supabase/recap'
import {
  distinctDayKeys,
  getCurrentTournamentDayKey,
  getSaturdayWeekKey,
} from '@/lib/utils/dateHelpers'
import { copyText } from '@/lib/utils/clipboard'

function RecapRow({
  emoji,
  title,
  detail,
}: {
  emoji: string
  title: string
  detail: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <span className="text-xl leading-none">{emoji}</span>
      <span className="text-sm">
        <span className="font-semibold">{title} — </span>
        <span className="text-muted-foreground">{detail}</span>
      </span>
    </li>
  )
}

/** Big colored tile for the week's best and worst. */
function BigTile({
  emoji,
  label,
  title,
  detail,
  accent,
}: {
  emoji: string
  label: string
  title: React.ReactNode
  detail: string
  accent: 'good' | 'bad'
}) {
  return (
    <div
      className={`flex flex-1 flex-col gap-1 rounded-2xl border p-3 ${
        accent === 'good' ? 'border-primary/40 bg-primary/10' : 'border-destructive/40 bg-destructive/10'
      }`}
    >
      <span className="text-3xl leading-none">{emoji}</span>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-extrabold">{title}</span>
      <span className="text-sm text-muted-foreground">{detail}</span>
    </div>
  )
}

/**
 * A single fun card summarizing the current week: champion, biggest win,
 * top scorer and best streak, with a copy-to-clipboard button for sharing
 * straight into the group WhatsApp chat.
 */
export function WeekRecapCard() {
  const { players, matches, loading } = useTournamentData()
  const [copied, setCopied] = useState(false)

  if (loading) return null

  // The recap follows the tournament, not the calendar week: the ongoing day
  // when it has results, otherwise the most recent day that does. Champion,
  // victim, biggest win and streaks all come from that same day.
  const days = distinctDayKeys(matches)
  const currentDayKey = getCurrentTournamentDayKey()
  const dayKey = days.includes(currentDayKey) ? currentDayKey : (days[0] ?? null)
  const recap = dayKey
    ? computeWeekRecap(
        matches,
        players,
        getSaturdayWeekKey(new Date(`${dayKey}T12:00:00Z`)),
        dayKey
      )
    : computeWeekRecap(matches, players, getSaturdayWeekKey(new Date()))

  if (recap.matchesCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-center text-sm text-muted-foreground">
        עדיין אין משחקים — סיכום הקובה יופיע כאן אחרי המשחק הראשון ⚽
      </div>
    )
  }

  const shareText = buildRecapShareText(recap)

  const onCopy = async () => {
    const ok = await copyText(shareText)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1 text-lg font-bold">
          סיכום הטורניר — {recap.weekLabel}
          <Trophy className="h-4 w-4 text-primary" />
        </h2>
        <Button size="sm" variant="outline" onClick={() => void onCopy()}>
          {copied ? (<><Check className="h-4 w-4" />הועתק</>) : 'העתק סיכום'}
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {(recap.champion || recap.loser) && (
          <div className="flex gap-3">
            {recap.champion && (
              <BigTile
                emoji="👑"
                label="אלוף השבוע"
                title={<TieNames name={recap.champion.name} tie={recap.champion.tie} />}
                detail={`עם ${recap.champion.points} נק׳`}
                accent="good"
              />
            )}
            {recap.loser && recap.loser.losses > 0 && (
              <BigTile
                emoji="😅"
                label="קורבן השבוע"
                title={<TieNames name={recap.loser.name} tie={recap.loser.tie} />}
                detail={`עם ${recap.loser.losses} הפסדים`}
                accent="bad"
              />
            )}
          </div>
        )}
        {recap.biggestWin && recap.biggestWin.margin > 0 && (
          <RecapRow
            emoji="💥"
            title="הניצחון הכי גדול"
            detail={recap.biggestWin.label}
          />
        )}
        {recap.longestStreak && recap.longestStreak.length >= 2 && (
          <RecapRow
            emoji="🔥"
            title="הרצף הארוך של הטורניר"
            detail={
              <>
                <TieNames name={recap.longestStreak.name} tie={recap.longestStreak.tie} />
                <span className="text-muted-foreground"> — {recap.longestStreak.length} ניצחונות ברצף</span>
              </>
            }
          />
        )}
        {recap.activeStreak &&
          recap.activeStreak.length >= 2 &&
          (recap.activeStreak.name !== recap.longestStreak?.name ||
            recap.activeStreak.length !== recap.longestStreak?.length) && (
            <RecapRow
              emoji="⚡"
              title="רצף פעיל"
              detail={
                <>
                  <TieNames name={recap.activeStreak.name} tie={recap.activeStreak.tie} />
                  <span className="text-muted-foreground"> — {recap.activeStreak.length} ניצחונות ברצף</span>
                </>
              }
            />
          )}
      </ul>
      <p className="text-xs text-muted-foreground">
        סה״כ {recap.matchesCount} משחקים ו-{recap.totalGoals} שערים
      </p>
    </div>
  )
}
