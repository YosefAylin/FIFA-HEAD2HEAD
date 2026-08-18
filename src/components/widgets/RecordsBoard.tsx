'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { computeCareerRecords } from '@/lib/supabase/stats'
import { rosterFor } from '@/lib/data/roster'
import { formatWeekKey } from '@/lib/utils/dateHelpers'

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

function displayName(name: string): string {
  const nick = rosterFor(name)?.nickname
  return nick ? `${name} (${nick})` : name
}

function RecordRow({
  emoji,
  title,
  detail,
}: {
  emoji: string
  title: string
  detail: string
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <span className="text-2xl leading-none">{emoji}</span>
      <span className="flex-1 text-sm">
        <span className="block font-semibold">{title}</span>
        <span className="text-muted-foreground">{detail}</span>
      </span>
    </li>
  )
}

/**
 * Career records + all-time champion trophy cabinet, powered entirely by
 * client-side data. Shows the biggest win, longest winning streak, most goals
 * in a single week, and most appearances — plus a tappable share button for
 * crowning the all-time champion.
 */
export function RecordsBoard() {
  const { players, matches, loading } = useTournamentData()
  const [copied, setCopied] = useState(false)

  const records = useMemo(
    () => computeCareerRecords(matches, players),
    [matches, players]
  )

  if (loading) return <p className="py-10 text-center text-muted-foreground">טוען…</p>

  const champion = records.overallChampion

  const shareText = champion
    ? `👑 אלוף כל הזמנים בקובה: ${displayName(champion.name)} עם ${champion.points} נק׳ (פרשים ${champion.goalDifference > 0 ? '+' : ''}${champion.goalDifference})`
    : 'עדיין אין נתונים כדי להכתיר אלוף כל הזמנים 😅'

  const onCopy = async () => {
    const ok = await copyText(shareText)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Trophy cabinet */}
      <div className="flex items-center justify-between rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 to-accent/10 p-5">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{champion ? '🏆' : '🕐'}</span>
          <div>
            {champion ? (
              <>
                <p className="text-xs text-muted-foreground">אלוף כל הזמנים</p>
                <p className="text-xl font-extrabold">{displayName(champion.name)}</p>
                <p className="text-sm text-muted-foreground">
                  {champion.points} נק׳ · פרשים {champion.goalDifference > 0 ? '+' : ''}{champion.goalDifference} · {champion.matches} משחקים
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">אין עדיין מספיק משחקים כדי להכתיר אלוף כל הזמנים</p>
            )}
          </div>
        </div>
        {champion && (
          <Button size="sm" variant="outline" onClick={() => void onCopy()}>
            {copied ? 'הועתק ✓' : 'לשתף'}
          </Button>
        )}
      </div>

      {/* Records list */}
      <ul className="flex flex-col gap-2">
        {records.biggestWin && (
          <RecordRow
            emoji="💥"
            title="הניצחון הכי גדול"
            detail={`${records.biggestWin.label} (${records.biggestWin.margin} שערים) — ${records.biggestWin.winnerName}`}
          />
        )}
        {records.longestStreak && (
          <RecordRow
            emoji="🔥"
            title="רצף ניצחונות"
            detail={`${records.longestStreak.name} — ${records.longestStreak.length} ניצחונות ברצף`}
          />
        )}
        {records.mostGoalsInWeek && (
          <RecordRow
            emoji="⚽"
            title="הכי הרבה שערים בשבוע אחד"
            detail={`${records.mostGoalsInWeek.name} — ${records.mostGoalsInWeek.goals} שערים (${formatWeekKey(records.mostGoalsInWeek.weekLabel)})`}
          />
        )}
        {records.mostMatches && (
          <RecordRow
            emoji="🎮"
            title="הכי הרבה משחקים"
            detail={`${records.mostMatches.name} — ${records.mostMatches.matches} משחקים`}
          />
        )}
        {!records.biggestWin && (
          <RecordRow emoji="🕐" title="אין עדיין שיאים" detail="רשמו את המשחק הראשון ופתחו את ארון הגביעים!" />
        )}
      </ul>
    </div>
  )
}
