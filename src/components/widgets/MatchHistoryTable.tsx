'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { restoreMatch, softDeleteMatch } from '@/lib/supabase/matches'
import { formatWeekKey } from '@/lib/utils/dateHelpers'
import type { MatchWithPlayers } from '@/lib/types/database'

interface Props {
  matches: MatchWithPlayers[]
  onChanged: () => void
  showDeleted?: boolean
}

function sideLabel(
  p1: string,
  p2: string | null,
  score: number,
  teamName: string | null
): { text: string; score: number } {
  const players = p2 ? `${p1} & ${p2}` : p1
  return { text: teamName ? `${teamName} (${players})` : players, score }
}

export function MatchHistoryTable({ matches, onChanged, showDeleted = false }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface py-10 text-center text-muted-foreground">
        אין משחקים{showDeleted ? ' למחוק' : ' עדיין'} — שחקו וצלמו! ⚽
      </p>
    )
  }

  async function handleDelete(id: string) {
    setBusy(true)
    try {
      await softDeleteMatch(id)
      onChanged()
    } finally {
      setBusy(false)
      setConfirmId(null)
    }
  }

  async function handleRestore(id: string) {
    setBusy(true)
    try {
      await restoreMatch(id)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {matches.map((m) => {
        const home = sideLabel(m.home_player_1_name, m.home_player_2_name, m.home_score, m.home_team_name)
        const away = sideLabel(m.away_player_1_name, m.away_player_2_name, m.away_score, m.away_team_name)
        return (
          <li
            key={m.id}
            className={`rounded-2xl border border-border bg-surface p-3 ${m.deleted_at ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{formatWeekKey(m.week_start_date)}</span>
              <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                {m.game_mode === '2v2' ? '2 על 2' : '1 על 1'}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex-1 text-right">
                <p className="font-semibold">{home.text}</p>
                <p className="text-sm text-muted-foreground">{away.text}</p>
              </div>
              <div className="flex items-center gap-2 text-xl font-extrabold tabular-nums">
                <span className={home.score > away.score ? 'text-success' : ''}>{home.score}</span>
                <span className="text-muted-foreground">-</span>
                <span className={away.score > home.score ? 'text-success' : ''}>{away.score}</span>
              </div>
            </div>

            {m.deleted_at ? (
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => void handleRestore(m.id)} disabled={busy}>
                שחזר משחק
              </Button>
            ) : (
              <div className="mt-2 flex justify-end">
                {confirmId === m.id ? (
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={() => void handleDelete(m.id)} disabled={busy}>
                      בטוח?
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                      ביטול
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmId(m.id)} className="text-destructive">
                    מחק
                  </Button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
