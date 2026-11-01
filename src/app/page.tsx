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

      {/* Bot one-liners + the tournament open/close toggle, always at the top. */}
      <BotTalk />
      <TournamentGate />

      {/* Then the three headline sections: recap, odds, last week's table. */}
      <WeekRecapCard />
      <WeeklyOddsCard />
      <LastWeekBoard />

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
