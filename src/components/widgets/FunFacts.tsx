'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { computeFunFacts } from '@/lib/supabase/stats'

/**
 * Lightweight all-time trivia board — the playful counterweight to the serious
 * records. Renders nothing until there is at least one fact to show.
 */
export function FunFacts() {
  const { players, matches, loading } = useTournamentData()
  const facts = useMemo(() => computeFunFacts(matches, players), [matches, players])

  if (loading || facts.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
        <Sparkles className="h-4 w-4 text-primary" /> עובדות משעשעות
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {facts.map((fact, i) => (
          <div
            key={fact.title}
            className="rise-in flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
            style={{ '--i': i } as React.CSSProperties}
          >
            <span className="text-2xl leading-none">{fact.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground">{fact.title}</p>
              <p className="truncate text-sm font-bold">{fact.holder}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{fact.detail}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
