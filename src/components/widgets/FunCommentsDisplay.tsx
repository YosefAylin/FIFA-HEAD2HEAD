'use client'

import { useEffect, useState } from 'react'
import { BANTER_PHRASES } from '@/lib/supabase/stats'

const INTERVAL_MS = 25000

/** Rotating banter banner that refreshes every ~25s. */
export function FunCommentsDisplay() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * BANTER_PHRASES.length))

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % BANTER_PHRASES.length)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-center">
      <p className="text-base font-medium text-accent">{BANTER_PHRASES[index]}</p>
    </div>
  )
}
