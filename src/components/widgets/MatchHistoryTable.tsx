'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, RotateCcw, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { restoreMatch, softDeleteMatch } from '@/lib/supabase/matches'
import { formatDayKey, matchDayKey } from '@/lib/utils/dateHelpers'
import type { MatchWithPlayers } from '@/lib/types/database'

interface Props {
  matches: MatchWithPlayers[]
  onChanged: () => void
  showDeleted?: boolean
}

interface SidePlayer {
  name: string
  avatar: string | null
}

interface Side {
  players: SidePlayer[]
  score: number
  teamName: string | null
}

function toSide(
  names: (string | null)[],
  avatars: (string | null)[],
  score: number,
  teamName: string | null
): Side {
  // 1v1 has a null second slot — drop it so no phantom blank avatar renders.
  const players = names
    .map((name, i) => ({ name, avatar: avatars[i] ?? null }))
    .filter((p): p is SidePlayer => Boolean(p.name))
  return { players, score, teamName }
}

/** One competitor line: avatar(s), name(s), optional team, big score alongside. */
function SideRow({ side, won, dimmed }: { side: Side; won: boolean; dimmed: boolean }) {
  const count = side.players.length
  // 1v1 → one big avatar; 2v2 → two avatars overlapped into a combined pair.
  const size = count > 1 ? 'md' : 'lg'
  const overlap = count > 1 ? -16 : 0
  return (
    <div className={`flex items-center gap-3 ${dimmed ? 'opacity-55' : ''}`}>
      <div className="flex shrink-0 items-center">
        {side.players.map((p, i) => (
          <span
            key={`${p.name}-${i}`}
            className="rounded-full ring-2 ring-surface"
            style={{ marginInlineStart: i === 0 ? 0 : overlap, zIndex: count - i }}
          >
            <Avatar name={p.name} src={p.avatar} size={size} />
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${won ? 'font-bold' : 'font-medium'}`}>
          {side.players.map((p) => p.name).join(' & ')}
        </p>
        {side.teamName && <p className="truncate text-[11px] text-muted-foreground">{side.teamName}</p>}
      </div>
      <span
        className={`w-10 shrink-0 text-center text-3xl font-extrabold tabular-nums ${
          won ? 'text-success' : 'text-muted-foreground'
        }`}
      >
        {side.score}
      </span>
    </div>
  )
}

function MatchCard({
  match,
  index,
  confirmId,
  setConfirmId,
  busy,
  onDelete,
  onRestore,
}: {
  match: MatchWithPlayers
  index: number
  confirmId: string | null
  setConfirmId: (id: string | null) => void
  busy: boolean
  onDelete: (id: string) => void
  onRestore: (id: string) => void
}) {
  const home = toSide(
    [match.home_player_1_name, match.home_player_2_name],
    [match.home_player_1_avatar_url, match.home_player_2_avatar_url],
    match.home_score,
    match.home_team_name
  )
  const away = toSide(
    [match.away_player_1_name, match.away_player_2_name],
    [match.away_player_1_avatar_url, match.away_player_2_avatar_url],
    match.away_score,
    match.away_team_name
  )
  const homeWon = match.home_score > match.away_score
  const awayWon = match.away_score > match.home_score
  const deleted = Boolean(match.deleted_at)

  return (
    <li
      className={`rise-in overflow-hidden rounded-2xl border bg-surface transition-all duration-200 hover:shadow-md ${
        deleted ? 'border-dashed border-border opacity-70' : 'border-border hover:border-primary/40'
      }`}
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 text-[11px] text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
          {match.game_mode === '2v2' ? '2 על 2' : '1 על 1'}
        </span>
        {deleted && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">נמחק</span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        <SideRow side={home} won={homeWon} dimmed={awayWon} />
        <div className="border-t border-dashed border-border/70" />
        <SideRow side={away} won={awayWon} dimmed={homeWon} />
      </div>

      <div className="flex items-center justify-end border-t border-border/60 px-2 py-1">
        {deleted ? (
          <Button variant="ghost" size="sm" onClick={() => onRestore(match.id)} disabled={busy}>
            <RotateCcw className="h-3.5 w-3.5" /> שחזר
          </Button>
        ) : confirmId === match.id ? (
          <div className="flex gap-1">
            <Button variant="destructive" size="sm" onClick={() => onDelete(match.id)} disabled={busy}>
              למחוק?
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
              ביטול
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmId(match.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> מחק
          </Button>
        )}
      </div>
    </li>
  )
}

/**
 * Match history as a day-grouped timeline. Each tournament day gets a header
 * (date + match/goal count) and its matches as score-forward cards with the
 * winner highlighted. Soft-deleted matches render dashed with a restore action.
 */
export function MatchHistoryTable({ matches, onChanged, showDeleted = false }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const groups = useMemo(() => {
    const map = new Map<string, MatchWithPlayers[]>()
    for (const m of matches) {
      const key = matchDayKey(m.created_at)
      const list = map.get(key)
      if (list) list.push(m)
      else map.set(key, [m])
    }
    return [...map.entries()]
      .map(([dayKey, list]) => ({
        dayKey,
        list,
        goals: list.reduce((s, m) => s + m.home_score + m.away_score, 0),
      }))
      .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
  }, [matches])

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

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-12 text-center">
        <p className="text-3xl">⚽</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {showDeleted ? 'אין משחקים שנמחקו' : 'אין משחקים עדיין — שחקו וצלמו!'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group, gi) => (
        <section key={group.dayKey} className="flex flex-col gap-2">
          <header className="flex items-center justify-between gap-2 px-1">
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <CalendarDays className="h-4 w-4 text-primary" />
              {formatDayKey(group.dayKey)}
            </h3>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {group.list.length} משחקים · {group.goals} שערים
            </span>
          </header>
          <ul className="flex flex-col gap-2">
            {group.list.map((m, i) => (
              <MatchCard
                key={m.id}
                match={m}
                index={gi === 0 ? i : 0}
                confirmId={confirmId}
                setConfirmId={setConfirmId}
                busy={busy}
                onDelete={handleDelete}
                onRestore={handleRestore}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
