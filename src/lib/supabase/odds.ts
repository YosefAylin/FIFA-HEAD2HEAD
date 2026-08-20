import type { PlayerStats } from '@/lib/supabase/stats'

/**
 * Pure odds engine for the "who brings the whisky / who loses this week" card.
 *
 * Kept free of any Supabase/React so it's unit-testable and the card just
 * feeds it inputs from `useTournamentData`. Percentage is a flavor stat, not
 * a betting line — a lighthearted read of the group's own numbers.
 */

export interface PlayerOddsInput {
  id: string
  name: string
  photo: string | null
  /** Current-season (this-week) PlayerStats — may be zero-rich pre-first-match. */
  season: PlayerStats
  /** Previous/all-session aggregate PlayerStats — the history baseline. */
  history: PlayerStats
  /**
   * Frozen power position, 0 = best (יוסף) .. 1 = worst, from the roster's
   * `POWER_RANK` order. The card starts here and live-nudges it.
   */
  powerPos: number
  /** True when the tournament is mid-run (Saturday gate open or manual on). */
  tournamentOpen: boolean
  /**
   * True once the session's informal ~21:00 cut has passed. When set, the
   * odds lean final/history even though the gate itself stays open for entry.
   */
  sessionEnded?: boolean
}

export interface PlayerOdds {
  id: string
  name: string
  photo: string | null
  /** 0..100 — chance they lose this week. */
  lose: number
  /** 0..100 — chance they're the one buying the whisky. */
  whisky: number
  /** One-line Hebrew reason (built from the same inputs). */
  reason: string
}

/** Recent-form score, 0 = steady .. 1 = all losses, over the last-5 window. */
export function recentFormScore(form: string): number {
  const f = form.slice(-5)
  if (!f.length) return 0
  let score = 0
  for (const r of f) score += r === 'W' ? 0 : r === 'D' ? 0.5 : 1
  return score / f.length
}

/** 0..1 loss-likelihood from a PlayerStats block (season or history). */
function blockLossScore(s: PlayerStats): number {
  const lossRate = s.matches ? s.losses / s.matches : 0.5 // no data → neutral
  const form = recentFormScore(s.form)
  // A season without matches leans on its form, else flattens to neutral.
  return s.matches ? 0.6 * form + 0.4 * lossRate : 0.5
}

/** Blend a season + history into a 0..1 lose score for the given session state. */
function loseScore(
  season: PlayerStats,
  history: PlayerStats,
  tournamentOpen: boolean,
  sessionEnded = false
): number {
  const s = blockLossScore(season)
  const h = blockLossScore(history)
  // Mid-run → heavy on the current week; ended/closed → lean history + neutral.
  if (tournamentOpen && !sessionEnded) return 0.65 * s + 0.35 * h
  return 0.3 * s + 0.4 * h + 0.3 * 0.5
}

/** Blend the re-ranked power position + lose odds into a 0..1 whisky weight. */
function whiskyWeight(powerPos: number, loseFrac: number): number {
  // High power (worst) → likely to buy; bad week nudges it up further.
  return 0.55 * powerPos + 0.45 * loseFrac
}

/** One-line reason driven by where the player lands after re-ranking. */
function reasonFor(powerPos: number, losses: number): string {
  if (powerPos > 0.65) return `נמוך בדירוג הכוח — ${losses} הפסדים סך הכל, הסיכוי האישי הכי גדול.`
  if (powerPos < 0.35) return `החזק ביותר בטבלת הכול — מעט הפסדים, סיכוי נמוך.`
  return `אמצע הטבלה — סיכוי בינוני.`
}
/** Compute a single player's lose/whisky + reason. Pure — no side effects. */
export function computePlayerOdds(input: PlayerOddsInput): PlayerOdds {
  const loseFrac = Math.min(1, loseScore(input.season, input.history, input.tournamentOpen, input.sessionEnded))
  const wash = whiskyWeight(input.powerPos, loseFrac)
  const lose = Math.round(100 * loseFrac)
  const whisky = Math.round(100 * Math.min(1, wash))

  return {
    id: input.id,
    name: input.name,
    photo: input.photo,
    lose,
    whisky,
    reason: reasonFor(input.powerPos, input.history.losses),
  }
}

/**
 * "Live nudge": re-rank the frozen power base by current-season results.
 * Each input already carries a frozen `powerPos` (0 = best .. 1 = worst) from
 * the roster order. Here we RE-SORT those positions by the current-season
 * record (points → fewer losses → win%), so a player having a bad week drifts
 * toward the back of the line, and a star rises. Returns a new array of
 * `powerPos` values aligned to `inputs`.
 *
 * Uses the frozen order only to break ties, so the group's pecking order
 * still wins when two players are equally hot/cold this season.
 */
export function nudgePowerPositions(inputs: PlayerOddsInput[]): number[] {
  const withPos = inputs.map((input) => {
    const s = input.season
    return {
      input,
      power: s.points,
      matches: s.matches,
      losses: s.losses,
      winPct: s.winPercentage,
      frozen: input.powerPos,
    }
  })
  const sorted = [...withPos].sort(
    (a, b) =>
      // Better season first: more points, more matches, fewer losses, higher win%.
      b.power - a.power ||
      b.matches - a.matches ||
      a.losses - b.losses ||
      b.winPct - a.winPct ||
      a.frozen - b.frozen
  )
  const byId = new Map(withPos.map((w) => [w.input.id, w.frozen]))
  return sorted.map((w) => byId.get(w.input.id) ?? 1)
}

/** Compute odds for every player, sorted best (least likely to buy) first. */
export function computePlayerOddsAll(inputs: PlayerOddsInput[]): PlayerOdds[] {
  const nudged = nudgePowerPositions(inputs)
  const withPos = inputs.map((input, i) => ({ ...input, powerPos: nudged[i] }))
  return withPos
    .map(computePlayerOdds)
    .sort((a, b) => b.whisky - a.whisky)
}