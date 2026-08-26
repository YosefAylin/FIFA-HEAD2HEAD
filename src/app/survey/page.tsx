'use client'

import { useEffect, useState } from 'react'
import { WhiskeySurvey } from '@/components/widgets/WhiskeySurvey'
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
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-ink">סקר הוויסקי</h1>
        <p className="text-sm text-ink-mid">החוזה השבועי — מי יקנה השבת את הבקבוק? אפשר לשנות עד סוף השבוע.</p>
      </header>
      {loading ? (
        <p className="py-10 text-center text-ink-mid">טוען…</p>
      ) : (
        <WhiskeySurvey players={players} />
      )}
    </div>
  )
}