'use client'

import { useMemo, useState } from 'react'
import { Check, Clock, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TieNames } from '@/components/widgets/TieNames'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { computeCareerRecords } from '@/lib/supabase/stats'
import { rosterFor } from '@/lib/data/roster'

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

/** Share-text holder (kept inline "A = B = C" so the copied text reads flat). */
function shareHolder(name: string, tie?: string[]): string {
  return tie && tie.length ? [name, ...tie].join(' = ') : name
}

function RecordRow({
  emoji,
  title,
  detail,
}: {
  emoji: string
  title: string
  detail: React.ReactNode
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
    ? `👑 אלוף כל הזמנים בקובה: ${shareHolder(champion.name, champion.tie)} עם ${champion.points} נק׳ (פרשים ${champion.goalDifference > 0 ? '+' : ''}${champion.goalDifference})`
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
          {champion ? (
            <Trophy className="h-9 w-9 shrink-0 text-primary" />
          ) : (
            <Clock className="h-9 w-9 shrink-0 text-muted-foreground" />
          )}
          <div>
            {champion ? (
              <>
                <p className="text-xs text-muted-foreground">אלוף כל הזמנים</p>
                <p className="text-xl font-extrabold">
                  <TieNames name={champion.name} tie={champion.tie} />
                </p>
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
            {copied ? (<><Check className="h-4 w-4" />הועתק</>) : 'לשתף'}
          </Button>
        )}
      </div>

      {/* Records list */}
      <ul className="flex flex-col gap-2">
        {records.biggestWin && (
          <RecordRow
            emoji="💥"
            title="הניצחון הכי גדול"
            detail={`${records.biggestWin.label} (${records.biggestWin.margin} שערים)`}
          />
        )}
        {records.longestStreak && (
          <RecordRow
            emoji="🔥"
            title="רצף ניצחונות"
            detail={
              <>
                <TieNames name={records.longestStreak.name} tie={records.longestStreak.tie} />
                <span className="text-muted-foreground"> — {records.longestStreak.length} ניצחונות ברצף</span>
              </>
            }
          />
        )}
        {records.mostLosses && (
          <RecordRow
            emoji="😈"
            title="הכי הרבה הפסדים"
            detail={
              <>
                <TieNames name={records.mostLosses.name} tie={records.mostLosses.tie} />
                <span className="text-muted-foreground"> — {records.mostLosses.losses} הפסדים</span>
              </>
            }
          />
        )}
        {records.longestLossStreak && (
          <RecordRow
            emoji="📉"
            title="רצף הפסדים"
            detail={
              <>
                <TieNames name={records.longestLossStreak.name} tie={records.longestLossStreak.tie} />
                <span className="text-muted-foreground"> — {records.longestLossStreak.length} הפסדים ברצף</span>
              </>
            }
          />
        )}
        {records.longestWinlessStreak && (
          <RecordRow
            emoji="🥶"
            title="בלי ניצחון"
            detail={
              <>
                <TieNames name={records.longestWinlessStreak.name} tie={records.longestWinlessStreak.tie} />
                <span className="text-muted-foreground"> — {records.longestWinlessStreak.length} משחקים בלי ניצחון</span>
              </>
            }
          />
        )}
        {records.mostMatches && (
          <RecordRow
            emoji="🎮"
            title="הכי הרבה משחקים"
            detail={
              <>
                <TieNames name={records.mostMatches.name} tie={records.mostMatches.tie} />
                <span className="text-muted-foreground"> — {records.mostMatches.matches} משחקים</span>
              </>
            }
          />
        )}
        {!records.biggestWin && (
          <RecordRow emoji="🕐" title="אין עדיין שיאים" detail="רשמו את המשחק הראשון ופתחו את ארון הגביעים!" />
        )}
      </ul>
    </div>
  )
}
