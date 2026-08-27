'use client'

import { Crown } from 'lucide-react'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { AllTimeBoard } from '@/components/widgets/AllTimeBoard'
import { BotTalk } from '@/components/widgets/BotTalk'
import { ChatBox } from '@/components/widgets/ChatBox'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { TournamentHub } from '@/components/widgets/TournamentHub'
import { WeekRecapCard } from '@/components/widgets/WeekRecapCard'
import { WeeklyOddsCard } from '@/components/widgets/WeeklyOddsCard'

export default function HomePage() {
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

  const chances = <WeeklyOddsCard />

  return (
    <div className="flex flex-col gap-4">
      <BotTalk />

      <TournamentGate />
      <TournamentHub />
      <WeekRecapCard />

      {/* All-time first by default; on game day the "chances" card jumps to the top. */}
      {gameOn ? <>{chances}{allTime}</> : <>{allTime}{chances}</>}

      <section>
        <ChatBox />
      </section>
    </div>
  )
}