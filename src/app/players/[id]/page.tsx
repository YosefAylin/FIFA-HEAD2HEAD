'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { UploadButton } from '@/components/widgets/UploadButton'
import { HeadToHeadButton } from '@/components/widgets/HeadToHeadButton'
import { MatchHistoryTable } from '@/components/widgets/MatchHistoryTable'
import { rosterFor } from '@/lib/data/roster'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { joinMatchesWithPlayers } from '@/lib/supabase/matches'
import { uploadAvatar } from '@/lib/supabase/players'
import { assignBadges, computePlayerStats } from '@/lib/supabase/stats'
import { getCurrentWeekKey, formatWeekKey } from '@/lib/utils/dateHelpers'

type Tab = 'serious' | 'fun' | 'history'

const TABS: { id: Tab; label: string }[] = [
  { id: 'serious', label: 'סטטיסטיקה' },
  { id: 'fun', label: 'באנטר' },
  { id: 'history', label: 'היסטוריה' },
]

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>()
  const playerId = params.id
  const { players, matches, loading, reload } = useTournamentData()
  const [tab, setTab] = useState<Tab>('serious')

  const player = players.find((p) => p.id === playerId)
  const weekKey = getCurrentWeekKey()

  const allTimeStats = useMemo(
    () => (player ? computePlayerStats(matches, player.id) : null),
    [matches, player]
  )
  const weekStats = useMemo(
    () => (player ? computePlayerStats(matches.filter((m) => m.week_start_date === weekKey), player.id) : null),
    [matches, player, weekKey]
  )
  const badge = useMemo(() => {
    if (!player) return null
    const map = new Map<string, ReturnType<typeof computePlayerStats>>()
    for (const p of players) map.set(p.id, computePlayerStats(matches, p.id))
    return assignBadges(players, map).get(player.id) ?? null
  }, [players, matches, player])

  const playerMatches = useMemo(
    () =>
      joinMatchesWithPlayers(
        matches.filter(
          (m) =>
            m.home_player_1_id === playerId ||
            m.home_player_2_id === playerId ||
            m.away_player_1_id === playerId ||
            m.away_player_2_id === playerId
        ),
        players
      ),
    [matches, players, playerId]
  )

  const overallRank = useMemo(() => {
    const ranked = [...players]
      .map((p) => ({ p, stats: computePlayerStats(matches, p.id) }))
      .sort((a, b) => b.stats.points - a.stats.points)
    return ranked.findIndex((r) => r.p.id === playerId) + 1
  }, [players, matches, playerId])

  if (loading) return <p className="py-10 text-center text-muted-foreground">טוען…</p>
  if (!player) return <p className="py-10 text-center text-muted-foreground">שחקן לא נמצא</p>

  const serious = allTimeStats

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="relative shrink-0">
          <Avatar name={player.name} src={player.profile_picture_url} size="xl" />
          <UploadButton playerId={player.id} onUploaded={() => reload?.()} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">
              {player.name} {rosterFor(player.name) && <span className="text-base font-medium text-muted-foreground">· {rosterFor(player.name)!.nickname}</span>}
            </h1>
            {overallRank <= 3 && <span className="text-2xl">{['🥇', '🥈', '🥉'][overallRank - 1]}</span>}
          </div>
          <p className="text-sm text-muted-foreground">מקום {overallRank} בטבלה הכללית</p>
          {badge && (
            <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
              <span>{badge.emoji}</span>
              <span>{badge.title} — {badge.detail}</span>
            </p>
          )}
        </div>
        <HeadToHeadButton playerId={player.id} players={players} matches={matches} />
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'serious' && serious && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="משחקים" value={String(serious.matches)} />
          <StatCard label="נקודות" value={String(serious.points)} accent />
          <StatCard label="אחוז ניצחון" value={`${Math.round(serious.winPercentage)}%`} />
          <StatCard label="שערים" value={`${serious.goalsFor} : ${serious.goalsAgainst}`} />
          <StatCard label="פרשים" value={`${serious.goalDifference > 0 ? '+' : ''}${serious.goalDifference}`} tone={serious.goalDifference >= 0 ? 'green' : 'red'} />
          <StatCard label="נ / פ / ה" value={`${serious.wins} / ${serious.draws} / ${serious.losses}`} />
        </div>
      )}

      {tab === 'fun' && allTimeStats && badge && (
        <div className="flex flex-col gap-3">
          <FunLine
            label="תקופה אחרונה"
            value={allTimeStats.form.split('').map((r, i) => <FormBadge key={i} r={r as 'W' | 'D' | 'L'} />)}
          />
          <FunLine
            label="רצף נוכחי"
            value={allTimeStats.currentStreak.split('').map((r, i) => <FormBadge key={i} r={r as 'W' | 'D' | 'L'} />)}
          />
          <FunLine
            label="מצב שיאים"
            value={
              allTimeStats.currentGoalDrought >= 2
                ? `בצורת שערים כבר ${allTimeStats.currentGoalDrought} משחקים 🥶`
                : 'כובש באופן קבוע 🎯'
            }
          />
          {weekStats && weekStats.matches > 0 && (
            <FunLine
              label="השבוע"
              value={`${weekStats.wins} ניצחונות, ${weekStats.points} נקודות`}
            />
          )}
          <p className="text-xs text-muted-foreground">
            השבוע הנוכחי: {formatWeekKey(weekKey)}
          </p>
        </div>
      )}

      {tab === 'history' && (
        <MatchHistoryTable matches={playerMatches} onChanged={() => {}} />
      )}
    </div>
  )
}

function StatCard({ label, value, tone, accent }: { label: string; value: string; tone?: 'green' | 'red'; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${accent ? 'border-primary/40 bg-primary/10' : 'border-border bg-surface'}`}>
      <div className={`text-xl font-extrabold ${tone === 'green' ? 'text-success' : tone === 'red' ? 'text-destructive' : ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function FunLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 text-sm font-medium">{value}</span>
    </div>
  )
}

function FormBadge({ r }: { r: 'W' | 'D' | 'L' }) {
  const map = {
    W: { text: 'נ', cls: 'bg-success text-white' },
    D: { text: 'פ', cls: 'bg-draw text-black' },
    L: { text: 'ה', cls: 'bg-destructive text-white' },
  }[r]
  return <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${map.cls}`}>{map.text}</span>
}
