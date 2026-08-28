'use client'

import { Trophy } from 'lucide-react'
import { TournamentHub } from '@/components/widgets/TournamentHub'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * The dedicated tournament tab. The gate banner (with the manual open/close
 * toggle), the binding whisky rule, the player grid, and the full add-match
 * flow live here (shared with home via `TournamentHub`).
 */
export default function TournamentPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Trophy className="h-5 w-5 text-primary" />
            הטורניר
          </h1>
        }
      />
      <TournamentGate />
      <TournamentHub />
    </div>
  )
}