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
  /** Current-gameweek PlayerStats — may be zero-rich pre-first-match. */
  season: PlayerStats
  /** LAST gameweek's PlayerStats — the recent-form signal. Defaults to neutral when absent. */
  previous?: PlayerStats
  /** All-session aggregate PlayerStats — the stability baseline. */
  history: PlayerStats
  /**
   * Frozen power position, 0 = best (יוסף) .. 1 = worst, from the roster's
   * `POWER_RANK` order. The card starts here and live-nudges it.
   */
  powerPos: number
  /** True when the tournament is open (Saturday or manual on). */
  tournamentOpen: boolean
  /**
   * Fraction (0..1) of the Saturday session still remaining — 1 = full session,
   * 0 = at the ~21:00 cut. Cross-fades the live-week weighting toward the
   * history + power-rank "final sort" as the session winds down. Ignored when
   * the tournament is closed. Defaults to 1.
   */
  timeRemainingFraction?: number
}

export interface PlayerOdds {
  id: string
  name: string
  photo: string | null
  /**
   * 0..100 — chance they lose this week, which is the same as bringing the
   * whisky: whoever ends up last owes a bottle. One number, one bar.
   */
  odds: number
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

/** 0..1 loss-likelihood from a PlayerStats block (season, last week or history). */
function blockLossScore(s: PlayerStats | undefined): number {
  if (!s) return 0.5 // no data → neutral
  const lossRate = s.matches ? s.losses / s.matches : 0.5 // no data → neutral
  const form = recentFormScore(s.form)
  // A week without matches leans on its form, else flattens to neutral.
  return s.matches ? 0.6 * form + 0.4 * lossRate : 0.5
}

/**
 * Blend current week, last week, all-time history and the power rank into a
 * single 0..1 "chance to lose" score (= chance to bring the whisky).
 * Mid-run the live week dominates; closed leans on the stable baselines.
 * While the session is open, the live-week weight cross-fades toward the
 * history + power-rank "final sort" as the countdown to the ~21:00 cut runs out.
 */
function loseChance(
  season: PlayerStats,
  previous: PlayerStats | undefined,
  history: PlayerStats,
  powerPos: number,
  tournamentOpen: boolean,
  timeRemainingFraction = 1
): number {
  const s = blockLossScore(season)
  const p = blockLossScore(previous)
  const h = blockLossScore(history)
  // Mid-run → weight the live week most, then last week, history, pecking order.
  const midRun = 0.4 * s + 0.25 * p + 0.2 * h + 0.15 * powerPos
  // Closed → lean history + power rank, flatten toward neutral.
  const final = 0.15 * s + 0.25 * p + 0.35 * h + 0.25 * powerPos
  if (!tournamentOpen) return Math.min(1, final)
  // Open mid-run → cross-fade from current-week-heavy toward the "final sort"
  // as the session countdown reaches zero. fraction=1 ⇒ exactly the old weights.
  const f = Math.min(1, Math.max(0, timeRemainingFraction))
  return Math.min(1, midRun * f + final * (1 - f))
}

/** Inputs the position-reason picker keys its choice on. */
export interface ReasonContext {
  name: string
  /** 0 = best (יוסף) .. 1 = worst, post-nudge. */
  powerPos: number
  /** All-time losses. */
  losses: number
  /** 0..1 loss-score of last week's block (blockLossScore(previous)). */
  prevLossScore: number
  /** Optional live countdown fraction; only present while open and not ended. */
  timeRemaining?: number
}

/** A single permanent, position-tiered reason template. */
export interface ReasonTemplate {
  key: string
  /** Deterministic — array order is priority, first true wins. */
  when: (ctx: ReasonContext) => boolean
  /** Hebrew copy with {name} / {losses} slots. */
  text: string
}

/**
 * Position-based reason sentences ("who brings the whisky" read). Used as the
 * offline/ambient fallback one-liner on the odds card — when a live
 * model-authored jab exists the card prefers that instead. Order IS the
 * priority: the first template whose `when` returns true wins.
 *
 * Two registers, so the copy matches the state of play:
 *  - OPEN (present): mid-session, live week dominates → "now / this week".
 *  - CLOSED (future): between sessions, leans on history → "next Saturday".
 */
export const REASON_TEMPLATES_OPEN: ReasonTemplate[] = [
  {
    key: 'late-session-final',
    when: (c) => c.timeRemaining !== undefined && c.timeRemaining < 0.35,
    text: '{name} — הזמן הולך ואוזל, הסיכויים ננעלים על ההיסטוריה ועל דירוג הכוח. {losses} הפסדים סך הכול.',
  },
  {
    key: 'bad-week-and-rise',
    when: (c) => c.prevLossScore >= 0.7 && c.powerPos > 0.35,
    text: '{name} — נמוך גם בשבוע שעבר, {losses} הפסדים סך הכול. הסיכוי הכי גדול להביא את הוויסקי.',
  },
  {
    key: 'power-bottom',
    when: (c) => c.powerPos > 0.65,
    text: '{name} — נמוך בדירוג הכוח, {losses} הפסדים סך הכול. עכשיו הסיכוי גבוה.',
  },
  {
    key: 'weak-start-week',
    when: (c) => c.prevLossScore >= 0.6,
    text: '{name} — פתיחה חלשה, {losses} הפסדים סך הכול. עכשיו הסיכוי בינוני-גבוה.',
  },
  {
    key: 'power-top',
    when: (c) => c.powerPos < 0.35,
    text: '{name} — החזק ביותר בדירוג. מעט הפסדים סך הכול, סיכוי נמוך להפסיד עכשיו.',
  },
  {
    key: 'mid-table',
    when: () => true,
    text: '{name} — אמצע הטבלה, {losses} הפסדים סך הכול. עכשיו סיכוי בינוני.',
  },
]

export const REASON_TEMPLATES_CLOSED: ReasonTemplate[] = [
  {
    key: 'bad-week-and-rise',
    when: (c) => c.prevLossScore >= 0.7 && c.powerPos > 0.35,
    text: '{name} — נמוך גם בשבוע שעבר, {losses} הפסדים סך הכול. הסיכוי הכי גדול להביא את הוויסקי בשבת הבאה.',
  },
  {
    key: 'power-bottom',
    when: (c) => c.powerPos > 0.65,
    text: '{name} — נמוך בדירוג הכוח, {losses} הפסדים סך הכול. סיכוי גבוה להביא בשבת הבאה.',
  },
  {
    key: 'weak-start-week',
    when: (c) => c.prevLossScore >= 0.6,
    text: '{name} — פתיחה חלשה לאחרונה, {losses} הפסדים סך הכול. סיכוי בינוני-גבוה בשבת הבאה.',
  },
  {
    key: 'power-top',
    when: (c) => c.powerPos < 0.35,
    text: '{name} — החזק ביותר בדירוג. מעט הפסדים סך הכול, סיכוי נמוך להפסיד בשבת הבאה.',
  },
  {
    key: 'mid-table',
    when: () => true,
    text: '{name} — אמצע הטבלה, {losses} הפסדים סך הכול. סיכוי בינוני בשבת הבאה.',
  },
]

/**
 * Deterministically pick + fill the reason template for a player. `timeRemaining`
 * is only set while the session is open, so its presence selects the present
 * (open) register; otherwise the future (closed) register is used.
 */
export function pickReason(ctx: ReasonContext): string {
  const templates = ctx.timeRemaining !== undefined ? REASON_TEMPLATES_OPEN : REASON_TEMPLATES_CLOSED
  const t = templates.find((t) => t.when(ctx)) ?? templates[templates.length - 1]
  return t.text.replaceAll('{name}', ctx.name).replaceAll('{losses}', String(ctx.losses))
}
/** Compute a single player's unified lose/whisky chance + reason. Pure. */
export function computePlayerOdds(input: PlayerOddsInput): PlayerOdds {
  const chance = loseChance(
    input.season,
    input.previous,
    input.history,
    input.powerPos,
    input.tournamentOpen,
    input.timeRemainingFraction
  )
  return {
    id: input.id,
    name: input.name,
    photo: input.photo,
    odds: Math.round(100 * chance),
    reason: pickReason({
      name: input.name,
      powerPos: input.powerPos,
      losses: input.history.losses,
      prevLossScore: blockLossScore(input.previous),
      // The countdown tier only applies while the session is open.
      timeRemaining: input.tournamentOpen ? input.timeRemainingFraction : undefined,
    }),
  }
}

/**
 * "Live nudge": re-rank the frozen power base by current-season results.
 * Each input already carries a frozen `powerPos` (0 = best .. 1 = worst) from
 * the roster order. Here we RE-SORT by the current-season record (points →
 * more matches → fewer losses → win%), so a player having a bad week drifts
 * toward the back of the line, and a star rises. Returns a new array of
 * `powerPos` values ALIGNED TO `inputs` — each player's own normalized rank in
 * the season order (0 = best .. 1 = worst).
 *
 * The frozen order only breaks ties, so the group's pecking order still wins
 * when two players are equally hot/cold this season.
 */
export function nudgePowerPositions(inputs: PlayerOddsInput[]): number[] {
  const sorted = [...inputs].sort(
    (a, b) =>
      // Better season first: more points, more matches, fewer losses, higher win%.
      b.season.points - a.season.points ||
      b.season.matches - a.season.matches ||
      a.season.losses - b.season.losses ||
      b.season.winPercentage - a.season.winPercentage ||
      a.powerPos - b.powerPos
  )
  const n = inputs.length
  const rankById = new Map(sorted.map((input, i) => [input.id, n > 1 ? i / (n - 1) : 0.5]))
  return inputs.map((input) => rankById.get(input.id) ?? input.powerPos)
}

/**
 * Scale independent 0..1 scores into whole percentages that sum to exactly 100
 * (largest-remainder rounding). All-zero input → all zeros.
 */
function normaliseToHundred(values: number[]): number[] {
  const total = values.reduce((s, v) => s + v, 0)
  if (total <= 0) return values.map(() => 0)
  const exact = values.map((v) => (v / total) * 100)
  const floors = exact.map((v) => Math.floor(v))
  let leftover = 100 - floors.reduce((s, v) => s + v, 0)
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < order.length && leftover > 0; k++, leftover--) floors[order[k].i]++
  return floors
}

/**
 * Compute odds for every player, sorted most likely to lose/buy first.
 *
 * The per-player loss scores are independent (each is its own 0..1 blend), so
 * they're normalised across the field into whole percentages that sum to 100 —
 * i.e. a player's number reads as "share of the group's whisky risk".
 */
export function computePlayerOddsAll(inputs: PlayerOddsInput[]): PlayerOdds[] {
  const nudged = nudgePowerPositions(inputs)
  const withPos = inputs.map((input, i) => ({ ...input, powerPos: nudged[i] }))

  const rows = withPos.map((input) => {
    const chance = loseChance(
      input.season,
      input.previous,
      input.history,
      input.powerPos,
      input.tournamentOpen,
      input.timeRemainingFraction
    )
    return {
      id: input.id,
      name: input.name,
      photo: input.photo,
      chance,
      reason: pickReason({
        name: input.name,
        powerPos: input.powerPos,
        losses: input.history.losses,
        prevLossScore: blockLossScore(input.previous),
        timeRemaining: input.tournamentOpen ? input.timeRemainingFraction : undefined,
      }),
    }
  })

  const odds = normaliseToHundred(rows.map((r) => r.chance))
  return rows
    .map((r, i) => ({ id: r.id, name: r.name, photo: r.photo, odds: odds[i], reason: r.reason }))
    .sort((a, b) => b.odds - a.odds)
}