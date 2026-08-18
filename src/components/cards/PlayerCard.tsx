'use client'

import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { jabFor, rosterFor } from '@/lib/data/roster'
import type { PlayerStats, FunBadge } from '@/lib/supabase/stats'
import type { Player } from '@/lib/types/database'

interface Props {
  player: Player
  stats: PlayerStats | null
  badge: FunBadge | null
  rank: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export function PlayerCard({ player, stats, badge, rank }: Props) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
    >
      {rank <= 3 && (
        <span className="absolute -top-2 right-3 text-2xl" title={`מקום ${rank}`}>
          {MEDALS[rank - 1]}
        </span>
      )}

      <Avatar name={player.name} src={player.profile_picture_url} size="xl" />
      <div>
        <h3 className="text-lg font-bold">
          {player.name} {rosterFor(player.name) && <span className="text-sm font-medium text-muted-foreground">· {rosterFor(player.name)!.nickname}</span>}
        </h3>
        {badge && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
              <span>{badge.emoji}</span>
              <span>{badge.title}</span>
            </p>
          )}
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{jabFor(player.name)}</p>
      </div>

      {stats && stats.matches > 0 ? (
        <div className="grid w-full grid-cols-4 gap-1 text-center text-xs">
          <Stat label="משחקים" value={String(stats.matches)} />
          <Stat label="נ" value={String(stats.wins)} tone="text-success" />
          <Stat label="פ" value={String(stats.draws)} tone="text-draw" />
          <Stat label="הפסד" value={String(stats.losses)} tone="text-destructive" />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">עוד לא שיחק השבוע</p>
      )}

      {stats && stats.matches > 0 && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>נקודות: <b className="text-foreground">{stats.points}</b></span>
          <span>פרשים: <b className="text-foreground">{stats.goalDifference > 0 ? '+' : ''}{stats.goalDifference}</b></span>
          <span>שערים: <b className="text-foreground">{stats.goalsFor}</b></span>
        </div>
      )}
    </Link>
  )
}

function Stat({ label, value, tone = 'text-foreground' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-background/50 py-1">
      <div className={`text-sm font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}
