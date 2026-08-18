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
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
        🔥 ראש בראש
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="ראש בראש">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">בחר יריב</span>
            <select
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              className="h-12 rounded-lg border border-input bg-background px-3 text-base"
            >
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
              <div className="flex items-center justify-around rounded-xl border border-border bg-background/50 p-3">
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={me.name} src={me.profile_picture_url} size="md" />
                  <span className="text-sm font-bold">{me.name}</span>
                  <span className="text-xl font-extrabold text-primary">{h2h.aWins}</span>
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  <div className="text-lg font-bold text-foreground">{h2h.draws}</div>
                  <div>תיקו</div>
                  <div className="mt-1 text-muted-foreground">
                    {h2h.aGoals} - {h2h.bGoals}
                  </div>
                  <div>שערים</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={opponent.name} src={opponent.profile_picture_url} size="md" />
                  <span className="text-sm font-bold">{opponent.name}</span>
                  <span className="text-xl font-extrabold text-destructive">{h2h.bWins}</span>
                </div>
              </div>

              <div className="flex justify-center gap-4 text-center text-xs text-muted-foreground">
                <span>מפגשים: <b className="text-foreground">{h2h.meetings}</b></span>
                <span>
                  אחוזי {me.name}:{' '}
                  <b className="text-foreground">
                    {h2h.meetings ? Math.round((h2h.aWins / h2h.meetings) * 100) : 0}%
                  </b>
                </span>
              </div>

              {h2h.recent.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">משחקים אחרונים</span>
                  {h2h.recent.map((m) => {
                    const meWon =
                      (m.home_player_1_id === playerId || m.home_player_2_id === playerId) &&
                      m.home_score > m.away_score
                    const oppWon =
                      (m.away_player_1_id === playerId || m.away_player_2_id === playerId) &&
                      m.away_score > m.home_score
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2 text-xs"
                      >
                        <span className="text-muted-foreground">{formatWeekKey(m.week_start_date)}</span>
                        <span className="tabular-nums">
                          {m.home_score} - {m.away_score}{' '}
                          {meWon ? '🏆' : oppWon ? '💔' : '🤝'}
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
