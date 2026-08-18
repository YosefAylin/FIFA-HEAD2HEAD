'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { buildRecapShareText, computeWeekRecap } from '@/lib/supabase/recap'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'

/** Copy Hebrew text to clipboard with a fallback for older browsers. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

function RecapRow({
  emoji,
  title,
  detail,
}: {
  emoji: string
  title: string
  detail: string
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

/**
 * A single fun card summarizing the current week: champion, biggest win,
 * top scorer and best streak, with a copy-to-clipboard button for sharing
 * straight into the group WhatsApp chat.
 */
export function WeekRecapCard() {
  const { players, matches, loading } = useTournamentData()
  const [copied, setCopied] = useState(false)

  if (loading) return null

  const weekKey = getCurrentWeekKey()
  const recap = computeWeekRecap(matches, players, weekKey)

  if (recap.matchesCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-4 text-center text-sm text-muted-foreground">
        עדיין אין משחקים השבוע — סיכום הקובה יופיע כאן אחרי המשחק הראשון ⚽
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
        <h2 className="text-lg font-bold">סיכום השבוע — {recap.weekLabel} 🏆</h2>
        <Button size="sm" variant="outline" onClick={() => void onCopy()}>
          {copied ? 'הועתק ✓' : 'העתק סיכום'}
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {recap.champion && (
          <RecapRow
            emoji="👑"
            title="אלוף השבוע"
            detail={`${recap.champion.name}${recap.champion.nickname ? ` (${recap.champion.nickname})` : ''} עם ${recap.champion.points} נק׳`}
          />
        )}
        {recap.biggestWin && recap.biggestWin.margin > 0 && (
          <RecapRow
            emoji="💥"
            title="הניצחון הכי גדול"
            detail={recap.biggestWin.label}
          />
        )}
        {recap.topScorer && (
          <RecapRow
            emoji="⚽"
            title="מלך השערים"
            detail={`${recap.topScorer.name} — ${recap.topScorer.goals} שערים`}
          />
        )}
        {recap.hotStreak && recap.hotStreak.length >= 2 && (
          <RecapRow
            emoji="🔥"
            title="הרצף הכי חם"
            detail={`${recap.hotStreak.name} — ${recap.hotStreak.length} ניצחונות ברצף`}
          />
        )}
      </ul>
      <p className="text-xs text-muted-foreground">
        סה״כ {recap.matchesCount} משחקים ו-{recap.totalGoals} שערים
      </p>
    </div>
  )
}
