'use client'

import { useEffect, useState } from 'react'
import { Wine } from 'lucide-react'
import { WhiskeySurvey } from '@/components/widgets/WhiskeySurvey'
import { PageHeader } from '@/components/ui/PageHeader'
import { fetchPlayers } from '@/lib/supabase/players'
import { regularsOnly } from '@/lib/utils/playerHelpers'
import type { Player } from '@/lib/types/database'

export default function SurveyPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Guests never carry the whisky — only regulars are up for the vote.
    void fetchPlayers().then((ps) => setPlayers(regularsOnly(ps))).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Wine className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold leading-tight">סקר הוויסקי</h1>
              <p className="text-xs text-muted-foreground">ההצבעה השבועית</p>
            </div>
          </div>
        }
      />
      {loading ? (
        <p className="py-10 text-center text-muted-foreground">טוען…</p>
      ) : (
        <WhiskeySurvey players={players} />
      )}
    </div>
  )
}
