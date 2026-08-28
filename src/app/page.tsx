'use client'

import { Crown } from 'lucide-react'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { AddGameBar } from '@/components/widgets/AddGameBar'
import { AllTimeBoard } from '@/components/widgets/AllTimeBoard'
import { BotTalk } from '@/components/widgets/BotTalk'
import { ChatBox } from '@/components/widgets/ChatBox'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { TournamentHub } from '@/components/widgets/TournamentHub'
import { WeekRecapCard } from '@/components/widgets/WeekRecapCard'
import { WeeklyOddsCard } from '@/components/widgets/WeeklyOddsCard'

export default function HomePage() {
  // "Game day" — the tournament gate is open (Saturday or manual override). When
  // on, the add-game hub + the loser-% (whisky) card show; when closed, the
  // compact week recap still shows.
  const { open: gameOn } = useTournamentGate()

  const allTime = (
    <section>
      <h2 className="mb-2 flex items-center justify-between text-lg font-bold">
        <span className="inline-flex items-center gap-1">טבלת כל הזמנים <Crown className="h-4 w-4 text-primary" /></span>
        <span className="text-xs font-normal text-muted-foreground">עמודה: נקודות</span>
      </h2>
      <AllTimeBoard />
    </section>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Page title, then the bot's one-liners. */}
      <h1 className="text-2xl font-extrabold tracking-tight">קובה של שבת</h1>
      <BotTalk />

      {/* Manual open/close + Saturday auto-open. */}
      <TournamentGate />

      {/* While the tournament is open: quick add-game hub + loser-% (whisky). */}
      {gameOn && <AddGameBar />}
      {gameOn && <WeeklyOddsCard />}

      {/* Instant gameweek recap — always visible. */}
      <WeekRecapCard />

      {/* This week's player grid + tap-to-build match flow (no duplicate add-game bar here). */}
      <TournamentHub gridOnly />

      {/* All-time league, then the chatbot last. */}
      {allTime}

      <section>
        <ChatBox />
      </section>
    </div>
  )
}