'use client'

import { formatWeekKey } from '@/lib/utils/dateHelpers'
import type { MatchWithPlayers } from '@/lib/types/database'

type Result = 'home' | 'away' | 'draw'

function teamLabel(m: MatchWithPlayers, side: 'home' | 'away'): string {
  const p1 = side === 'home' ? m.home_player_1_name : m.away_player_1_name
  const p2 = side === 'home' ? m.home_player_2_name : m.away_player_2_name
  const teamName = side === 'home' ? m.home_team_name : m.away_team_name
  if (teamName) return teamName
  return p2 ? `${p1} & ${p2}` : p1
}

function resultOf(m: MatchWithPlayers): Result {
  if (m.home_score > m.away_score) return 'home'
  if (m.away_score > m.home_score) return 'away'
  return 'draw'
}

interface MatchResultProps {
  /** The match to render. Player names must be joined for display. */
  match: MatchWithPlayers
  /** Show the week kicker above the scoreboard. */
  showWeek?: boolean
  className?: string
}

/**
 * A football scoreline — team names at the RTL start, score at the end, the
 * winner carried by ink-weight + a gold tick (never color alone). Draw reads as
 * two even rows. Compact enough to stack in a divide-y match list.
 */
export function MatchResult({ match, showWeek = false, className = '' }: MatchResultProps) {
  const winner = resultOf(match)
  const homeLabel = teamLabel(match, 'home')
  const awayLabel = teamLabel(match, 'away')

  return (
    <div className={className}>
      {showWeek && (
        <div className="mb-1 flex items-center gap-2 text-[11px] text-ink-mid">
          <span>{formatWeekKey(match.week_start_date)}</span>
          <span className="h-1 w-1 rounded-full bg-lines" aria-hidden="true" />
          <span>{match.game_mode === '2v2' ? '2 על 2' : '1 על 1'}</span>
        </div>
      )}

      <div className="divide-y divide-lines-sid">
        <ScoreRow
          label={homeLabel}
          score={match.home_score}
          tone={winner === 'home' ? 'win' : winner === 'away' ? 'lose' : 'draw'}
        />
        <ScoreRow
          label={awayLabel}
          score={match.away_score}
          tone={winner === 'away' ? 'win' : winner === 'home' ? 'lose' : 'draw'}
        />
      </div>
    </div>
  )
}

function ScoreRow({
  label,
  score,
  tone,
}: {
  label: string
  score: number
  tone: 'win' | 'draw' | 'lose'
}) {
  const rowTone =
    tone === 'win'
      ? 'font-bold text-ink'
      : tone === 'draw'
        ? 'font-medium text-ink-mid'
        : 'font-normal text-ink-faint'

  return (
    <div className={`flex items-baseline gap-2 py-1.5 ${rowTone}`}>
      <span className="min-w-0 flex-1 truncate text-right text-[15px] leading-tight">{label}</span>
      {tone === 'win' && (
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 shrink-0 text-gold" aria-label="ניצחון">
          <path d="m2 6.5 2.5 2.5L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span className={`w-8 shrink-0 text-left tabular-nums text-xl font-bold ${rowTone}`}>{score}</span>
    </div>
  )
}