'use client'

import { AllTimeBoard } from '@/components/widgets/AllTimeBoard'
import { BotTalk } from '@/components/widgets/BotTalk'
import { ChatBox } from '@/components/widgets/ChatBox'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { TournamentHub } from '@/components/widgets/TournamentHub'
import { WeekRecapCard } from '@/components/widgets/WeekRecapCard'
import { WeeklyOddsCard } from '@/components/widgets/WeeklyOddsCard'

export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <BotTalk />

      <TournamentGate />
      <TournamentHub />
      <WeekRecapCard />
      <WeeklyOddsCard />

      <section>
        <h2 className="mb-2 flex items-center justify-between text-lg font-bold">
          <span>טבלת כל הזמנים 👑</span>
          <span className="text-xs font-normal text-muted-foreground">עמודה: נקודות</span>
        </h2>
        <AllTimeBoard />
      </section>

      <section>
        <ChatBox />
      </section>
    </div>
  )
}