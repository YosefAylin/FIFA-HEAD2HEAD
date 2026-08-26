'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { computeHeadToHead } from '@/lib/supabase/stats'
import { formatWeekKey } from '@/lib/utils/dateHelpers'
import type { Match, Player } from '@/lib/types/database'

interface Props {
  playerId: string
  players: Player[]
  matches: Match[]
}

const selectClass =
  'h-11 rounded-xl border border-lines bg-raised/50 px-3 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30'

/** Opens a head-to-head comparison between a player and any opponent. */
export function HeadToHeadButton({ playerId, players, matches }: Props) {
  const [open, setOpen] = useState(false)
  const [opponentId, setOpponentId] = useState('')
  const me = players.find((p) => p.id === playerId)
  const opponents = players.filter((p) => p.id !== playerId)

  const h2h = useMemo(() => {
    if (!opponentId) return null
    return computeHeadToHead(matches, playerId, opponentId)
  }, [matches, playerId, opponentId])

  const opponent = players.find((p) => p.id === opponentId)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full border-gold/30 text-gold hover:bg-gold/10 sm:w-auto"
      >
        🔥 ראש בראש
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="ראש בראש" kicker="מאבק אישי">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-mid">בחר יריב</span>
            <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)} className={selectClass}>
              <option value="">בחר שחקן…</option>
              {opponents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {h2h && me && opponent && (
            <div className="flex flex-col gap-4">
              {/* Scoreboard-face-off */}
              <div className="flex items-center justify-around rounded-2xl border border-lines bg-raised/40 p-3">
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={me.name} src={me.profile_picture_url} size="md" />
                  <span className="text-sm font-bold text-ink">{me.name}</span>
                  <span className="text-2xl font-black tabular-nums text-win">
                    {h2h.aWins}
                    <span className="ml-1 text-xs font-semibold text-win/70">נ</span>
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black tabular-nums text-ink">{h2h.draws}</div>
                  <div className="text-xs text-ink-mid">תיקו</div>
                  <div className="mt-1.5 text-sm font-bold tabular-nums text-ink">{h2h.aGoals} : {h2h.bGoals}</div>
                  <div className="text-[11px] text-ink-mid">שערים</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={opponent.name} src={opponent.profile_picture_url} size="md" />
                  <span className="text-sm font-bold text-ink">{opponent.name}</span>
                  <span className="text-2xl font-black tabular-nums text-loss">
                    {h2h.bWins}
                    <span className="ml-1 text-xs font-semibold text-ink/70">נ</span>
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-5 text-center text-xs text-ink-mid">
                <span>
                  מפגשים: <b className="text-ink">{h2h.meetings}</b>
                </span>
                <span>
                  אחוזי {me.name}: <b className="text-ink">{h2h.meetings ? Math.round((h2h.aWins / h2h.meetings) * 100) : 0}%</b>
                </span>
              </div>

              {h2h.recent.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-ink-mid">משחקים אחרונים</span>
                  {h2h.recent.map((m) => {
                    const meWon =
                      (m.home_player_1_id === playerId || m.home_player_2_id === playerId) && m.home_score > m.away_score
                    const oppWon =
                      (m.away_player_1_id === playerId || m.away_player_2_id === playerId) && m.away_score > m.home_score
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl bg-raised/50 px-3 py-2 text-xs text-ink"
                      >
                        <span className="text-ink-mid">{formatWeekKey(m.week_start_date)}</span>
                        <span className="tabular-nums">
                          {m.home_score} - {m.away_score} {meWon ? '🏆' : oppWon ? '💔' : '🤝'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}