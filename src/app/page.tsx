'use client'

import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { AddGameBar } from '@/components/widgets/AddGameBar'
import { BotTalk } from '@/components/widgets/BotTalk'
import { ChatBox } from '@/components/widgets/ChatBox'
import { FunFacts } from '@/components/widgets/FunFacts'
import { LastWeekBoard } from '@/components/widgets/LastWeekBoard'
import { RecordsBoard } from '@/components/widgets/RecordsBoard'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { TournamentHub } from '@/components/widgets/TournamentHub'
import { WeekRecapCard } from '@/components/widgets/WeekRecapCard'
import { WeeklyOddsCard } from '@/components/widgets/WeeklyOddsCard'
import { PageHeader } from '@/components/ui/PageHeader'

export default function HomePage() {
  // "Game day" — the tournament gate is open (Saturday or manual override).
  const { open: gameOn } = useTournamentGate()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={<h1 className="text-2xl font-extrabold tracking-tight">קובה של שבת</h1>} />

      {/* 1. The tournament recap leads the page. */}
      <WeekRecapCard />

      {/* 2. Whisky odds. */}
      <WeeklyOddsCard />

      {/* 3. Last week's table — the everyday leaderboard. */}
      <LastWeekBoard />

      {/* Bot one-liners + manual open/close (status strips, below the top 3). */}
      <BotTalk />
      <TournamentGate />

      {/* Open: quick add-game hub, then this week's player grid. */}
      {gameOn && <AddGameBar />}
      {gameOn && <TournamentHub gridOnly />}

      {/* All-time extras live at the bottom, facts first. */}
      <FunFacts />
      <RecordsBoard />

      <section>
        <ChatBox />
      </section>
    </div>
  )
}
