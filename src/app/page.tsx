'use client'

import { AllTimeBoard } from '@/components/widgets/AllTimeBoard'
import { BotTalk } from '@/components/widgets/BotTalk'
import { ChatBox } from '@/components/widgets/ChatBox'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { TournamentHub } from '@/components/widgets/TournamentHub'
import { WeekRecapCard } from '@/components/widgets/WeekRecapCard'

/**
 * Home — "what's happening in קובה של שבת right now?" One vertical story:
 * the live gate → the bot's line → this week's players + recap → the
 * all-time board → the open chat. No pile of independent cards.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <TournamentGate />

      <section>
        <BotTalk />
      </section>

      {/* The live tournament */}
      <section aria-label="הטורניר השבוע">
        <TournamentHub />
      </section>

      {/* The week so far */}
      <WeekRecapCard />

      {/* All-time leaderboard */}
      <section className="rise-3">
        <h2 className="mb-3 text-[15px] font-bold text-ink">טבלת כל הזמנים</h2>
        <AllTimeBoard />
      </section>

      {/* Open chat */}
      <section aria-label="צ'אט">
        <ChatBox />
      </section>
    </div>
  )
}