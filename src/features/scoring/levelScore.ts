/**
 * Local score for one attempt at a mission.
 *
 * The rule a child should be able to repeat out loud: getting it right is what counts,
 * and being quick only adds a little on top. Answering correctly but slowly always beats
 * answering wrongly in a flash, so the game rewards looking carefully rather than rushing.
 *
 * Nothing here knows anything about a particular question: it works from the outcome of
 * each round, which keeps the formula independent of the educational content.
 */

/** Every mission is scored on the same scale, so results can be compared. */
export const MAX_LEVEL_SCORE = 1000;

/**
 * Points a single round can earn. Kept together so the balance can be reviewed and
 * changed in one place instead of being spread through the interface.
 */
export const ROUND_SCORE = {
  /** A correct answer in a round with no clock: full marks for accuracy. */
  untimedCorrect: 1000,
  /** The part of a timed correct answer that accuracy alone earns. */
  timedCorrectBase: 700,
  /** The most that answering quickly can add on top of being correct. */
  timedSpeedBonus: 300,
  /** A wrong answer still acknowledges the attempt, but barely. */
  incorrect: 60,
  /** Letting the clock run out scores below answering and being wrong. */
  timeout: 30
} as const;

export type RoundOutcome =
  | { result: "correct"; remainingMs?: number; durationMs?: number }
  | { result: "incorrect" }
  | { result: "timeout" };

function isPositiveFinite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * The share of the round's clock still unused, from 0 to 1. Missing or impossible
 * timings are treated as "no speed information", never as a penalty.
 */
export function getSpeedFactor(remainingMs: number | undefined, durationMs: number | undefined): number {
  if (!isPositiveFinite(durationMs)) return 0;
  if (typeof remainingMs !== "number" || !Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  return Math.min(1, remainingMs / durationMs);
}

/** Points earned by one round, always between 0 and the round maximum. */
export function scoreRound(outcome: RoundOutcome): number {
  if (outcome.result === "timeout") return ROUND_SCORE.timeout;
  if (outcome.result === "incorrect") return ROUND_SCORE.incorrect;

  // A round with no usable clock is untimed as far as scoring is concerned, and a
  // missing timer must never cost the player points.
  if (!isPositiveFinite(outcome.durationMs)) return ROUND_SCORE.untimedCorrect;

  const speedFactor = getSpeedFactor(outcome.remainingMs, outcome.durationMs);
  return ROUND_SCORE.timedCorrectBase + Math.round(ROUND_SCORE.timedSpeedBonus * speedFactor);
}

/**
 * The attempt score: the average of its rounds, on the shared 0-1000 scale. An attempt
 * with no rounds scores zero rather than dividing by nothing.
 */
export function calculateLevelScore(rounds: readonly RoundOutcome[]): number {
  if (rounds.length === 0) return 0;

  const total = rounds.reduce((sum, round) => sum + scoreRound(round), 0);
  const normalized = Math.round(total / rounds.length);
  return Math.min(MAX_LEVEL_SCORE, Math.max(0, normalized));
}

/** Stars shown next to the number, because a child reads three stars faster than "840". */
export const STAR_THRESHOLDS = [400, 650, 850] as const;

export function getStarCount(score: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(score)) return 0;
  return STAR_THRESHOLDS.filter((threshold) => score >= threshold).length as 0 | 1 | 2 | 3;
}

export function isLevelScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_LEVEL_SCORE
  );
}

/** Clamps a stored or computed value onto the shared scale, or reports it as missing. */
export function parseLevelScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(MAX_LEVEL_SCORE, Math.max(0, Math.round(value)));
}
