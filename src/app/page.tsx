'use client'

import { Crown } from 'lucide-react'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { AddGameBar } from '@/components/widgets/AddGameBar'
import { AllTimeBoard } from '@/components/widgets/AllTimeBoard'
import { BotTalk } from '@/components/widgets/BotTalk'
import { ChatBox } from '@/components/widgets/ChatBox'
import { FunFacts } from '@/components/widgets/FunFacts'
import { RecordsBoard } from '@/components/widgets/RecordsBoard'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { TournamentHub } from '@/components/widgets/TournamentHub'
import { WeekRecapCard } from '@/components/widgets/WeekRecapCard'
import { WeeklyOddsCard } from '@/components/widgets/WeeklyOddsCard'
import { PageHeader } from '@/components/ui/PageHeader'

export default function HomePage() {
  // "Game day" — the tournament gate is open (Saturday or manual override). When
  // open the add-game hub, the loser-% (whisky) card and the players hub show;
  // when closed the hub is swapped for the trophy cabinet + fun facts.
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
      {/* Page title (toggle level with it), then the bot's one-liners. */}
      <PageHeader title={<h1 className="text-2xl font-extrabold tracking-tight">קובה של שבת</h1>} />
      <BotTalk />

      {/* Manual open/close + Saturday auto-open. */}
      <TournamentGate />

      {/* Open: quick add-game hub. The loser-% (whisky) card shows open AND
          closed — closed it leans on history + the pecking order. */}
      {gameOn && <AddGameBar />}
      <WeeklyOddsCard />

      {/* Instant gameweek recap — always visible. */}
      <WeekRecapCard />

      {/* Open: this week's player grid + tap-to-build match flow (no duplicate
          add-game bar here). Closed: the players hub hides, replaced by the
          trophy cabinet + fun facts. */}
      {gameOn ? (
        <TournamentHub gridOnly />
      ) : (
        <>
          <RecordsBoard />
          <FunFacts />
        </>
      )}

      {/* All-time league, then the chatbot last. */}
      {allTime}

      <section>
        <ChatBox />
      </section>
    </div>
  )
}