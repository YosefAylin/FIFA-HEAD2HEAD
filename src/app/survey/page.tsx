'use client'

import { useEffect, useState } from 'react'
import { WhiskeySurvey } from '@/components/widgets/WhiskeySurvey'
import { PageHeader } from '@/components/ui/PageHeader'
import { fetchPlayers } from '@/lib/supabase/players'
import type { Player } from '@/lib/types/database'

export default function SurveyPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchPlayers().then(setPlayers).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={<h1 className="text-xl font-bold">סקר הוויסקי 🥃</h1>} />
      {loading ? (
        <p className="py-10 text-center text-muted-foreground">טוען…</p>
      ) : (
        <WhiskeySurvey players={players} />
      )}
    </div>
  )
}
