'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TieNames } from '@/components/widgets/TieNames'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { buildRecapShareText, computeWeekRecap } from '@/lib/supabase/recap'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'

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

function RecapRow({ icon, title, detail }: { icon: string; title: string; detail: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 border-b border-lines-sid py-2 last:border-0">
      <span className="w-5 text-base leading-none">{icon}</span>
      <span className="text-sm text-ink">
        <span className="font-semibold">{title} · </span>
        <span className="text-ink-mid">{detail}</span>
      </span>
    </li>
  )
}

/**
 * The week's story — a compact match-night summary: champion, biggest win,
 * top scorer, best streak. Scoreline rows + one share button for WhatsApp.
 */
export function WeekRecapCard() {
  const { players, matches, loading } = useTournamentData()
  const [copied, setCopied] = useState(false)

  if (loading) return null

  const weekKey = getCurrentWeekKey()
  const recap = computeWeekRecap(matches, players, weekKey)

  if (recap.matchesCount === 0) {
    return (
      <div className="border-b border-lines pb-4 text-center text-sm text-ink-faint">
        עדיין אין משחקים השבוע — סיכום הקובה יופיע אחרי הראשון ⚽
      </div>
    )
  }

  const onCopy = async () => {
    const ok = await copyText(buildRecapShareText(recap))
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="rise-2">
      <div className="mb-3 flex items-center gap-1">
        <h2 className="text-[15px] font-bold text-ink">סיכום השבוע</h2>
        <span className="text-[13px] text-ink-faint">{recap.weekLabel}</span>
        <span className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => void onCopy()}>
          {copied ? 'הועתק' : 'לשיתוף'}
        </Button>
      </div>

      <ul>
        {recap.champion && (
          <li className="mb-3 flex items-center gap-3 rounded-[20px] border border-lines bg-surface px-4 py-3">
            <span className="text-xl leading-none">🏆</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-faint">אלוף השבוע</p>
              <p className="text-base font-bold text-ink">
                <TieNames name={recap.champion.name} tie={recap.champion.tie} />
              </p>
            </div>
            <span className="text-lg font-black tabular-nums text-gold">{recap.champion.points}</span>
          </li>
        )}
        {recap.biggestWin && recap.biggestWin.margin > 0 && (
          <RecapRow icon="💥" title="הניצחון הכי גדול" detail={recap.biggestWin.label} />
        )}
        {recap.topScorer && (
          <RecapRow
            icon="⚽"
            title="מצב השערים"
            detail={
              <>
                <TieNames name={recap.topScorer.name} tie={recap.topScorer.tie} />
                <span className="text-ink-faint"> · {recap.topScorer.goals} שערים</span>
              </>
            }
          />
        )}
        {recap.hotStreak && recap.hotStreak.length >= 2 && (
          <RecapRow
            icon="🔥"
            title="הרצף הכי חם"
            detail={
              <>
                <TieNames name={recap.hotStreak.name} tie={recap.hotStreak.tie} />
                <span className="text-ink-faint"> · {recap.hotStreak.length} ניצחונות ברצף</span>
              </>
            }
          />
        )}
      </ul>
      <p className="mt-2 text-[11px] text-ink-faint">
        סה״כ {recap.matchesCount} משחקים · {recap.totalGoals} שערים
      </p>
    </section>
  )
}