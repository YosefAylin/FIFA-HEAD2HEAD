'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TieNames } from '@/components/widgets/TieNames'
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

/** Share-text holder (kept inline "A = B = C" so the copied text reads flat). */
function shareHolder(name: string, tie?: string[]): string {
  return tie && tie.length ? [name, ...tie].join(' = ') : name
}

function RecordRow({
  emoji,
  title,
  detail,
  rank,
}: {
  emoji: string
  title: string
  detail: React.ReactNode
  rank?: number
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-lines bg-surface px-4 py-3">
      <span className="text-2xl leading-none">{emoji}</span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-bold text-ink">{title}</span>
        <span className="text-ink-mid">{detail}</span>
      </span>
      {typeof rank === 'number' && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
            rank === 1 ? 'bg-gold/15 text-gold' : 'bg-raised text-ink-mid'
          }`}
        >
          #{rank}
        </span>
      )}
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

  const records = useMemo(() => computeCareerRecords(matches, players), [matches, players])

  if (loading) return <p className="py-10 text-center text-ink-mid">טוען…</p>

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
      <div className="flex items-center justify-between gap-3 rounded-[20px] border border-gold/25 bg-gradient-to-br from-gold/12 via-gold/5 to-gold/2 p-5">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{champion ? '🏆' : '🕐'}</span>
          <div>
            {champion ? (
              <>
                <p className="text-xs font-medium text-gold/80">אלוף כל הזמנים</p>
                <p className="text-xl font-black tracking-tight text-ink">
                  <TieNames name={champion.name} tie={champion.tie} />
                </p>
                <p className="text-sm text-ink-mid">
                  {champion.points} נק׳ · פרשים {champion.goalDifference > 0 ? '+' : ''}{champion.goalDifference} ·{' '}
                  {champion.matches} משחקים
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-mid">אין עדיין מספיק משחקים כדי להכתיר אלוף בכל הזמנים</p>
            )}
          </div>
        </div>
        {champion && (
          <Button size="sm" variant="outline" onClick={() => void onCopy()}>
            {copied ? 'הועתק ✓' : 'לשתף'}
          </Button>
        )}
      </div>

      {/* Records list — a trophy cabinet of storylines, each ranke */}
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
            rank={1}
            detail={
              <>
                <TieNames name={records.longestStreak.name} tie={records.longestStreak.tie} />
                <span className="text-ink-mid"> — {records.longestStreak.length} ניצחונות ברצף</span>
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
                <span className="text-ink-mid"> — {records.mostLosses.losses} הפסדים</span>
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
                <span className="text-ink-mid"> — {records.longestLossStreak.length} הפסדים ברצף</span>
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
                <span className="text-ink-mid"> — {records.longestWinlessStreak.length} משחקים בלי ניצחון</span>
              </>
            }
          />
        )}
        {records.mostConceded && (
          <RecordRow
            emoji="🧤"
            title="הכי הרבה ספיגות"
            detail={
              <>
                <TieNames name={records.mostConceded.name} tie={records.mostConceded.tie} />
                <span className="text-ink-mid"> — {records.mostConceded.goalsAgainst} שערים ספג</span>
              </>
            }
          />
        )}
        {records.mostGoalsInWeek && (
          <RecordRow
            emoji="⚽"
            title="הכי הרבה שערים בשבוע אחד"
            detail={
              <>
                <TieNames name={records.mostGoalsInWeek.name} tie={records.mostGoalsInWeek.tie} />
                <span className="text-ink-mid"> — {records.mostGoalsInWeek.goals} שערים ({formatWeekKey(records.mostGoalsInWeek.weekLabel)})</span>
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
                <span className="text-ink-mid"> — {records.mostMatches.matches} משחקים</span>
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