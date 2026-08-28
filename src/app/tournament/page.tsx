'use client'

import { TournamentHub } from '@/components/widgets/TournamentHub'
import { TournamentGate } from '@/components/widgets/TournamentGate'

/**
 * The dedicated tournament tab. The gate banner (with the manual open/close
 * toggle), the binding whisky rule, the player grid, and the full add-match
 * flow live here (shared with home via `TournamentHub`).
 */
export default function TournamentPage() {
  return (
    <div className="flex flex-col gap-4">
      <TournamentGate />
      <TournamentHub />
    </div>
  )
}