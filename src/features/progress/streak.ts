/**
 * How many days in a row the player has come back.
 *
 * A streak is about the calendar the child lives in, not about clock time, so everything
 * here works on a local calendar day written as `YYYY-MM-DD`. The day is decided once,
 * where the device clock is available, and passed in: nothing in this file reads a clock,
 * which is what makes the rules testable and identical on every device.
 */
export type Streak = {
  currentDays: number;
  bestDays: number;
  /** The last local day the player finished a mission, or null before they ever have. */
  lastPlayedOn: string | null;
};

export const initialStreak: Streak = { currentDays: 0, bestDays: 0, lastPlayedOn: null };

const playedOnPattern = /^\d{4}-\d{2}-\d{2}$/;

export function isPlayedOn(value: unknown): value is string {
  if (typeof value !== "string" || !playedOnPattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // Rejects impossible days like 2026-02-31, which round-trip to a different date.
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** The local calendar day of a moment, never the UTC one: a streak follows the child. */
export function getLocalPlayedOn(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toUtcMidnight(playedOn: string): number {
  return new Date(`${playedOn}T00:00:00Z`).getTime();
}

/** Whole days between two local days; both are treated as midnight, so DST cannot shift it. */
export function getDaysBetween(from: string, to: string): number | null {
  if (!isPlayedOn(from) || !isPlayedOn(to)) return null;
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / 86_400_000);
}

/**
 * Folds a finished mission into the streak.
 *
 * Playing again the same day changes nothing, so a child cannot inflate a streak by
 * replaying. A missed day starts over at one rather than at zero: the day they came back
 * still counts. The best streak is a high-water mark and is never lowered.
 */
export function recordPlayedDay(streak: Streak, playedOn: string): Streak {
  if (!isPlayedOn(playedOn)) return streak;

  const gap = streak.lastPlayedOn ? getDaysBetween(streak.lastPlayedOn, playedOn) : null;
  if (gap === 0) return streak;

  // A day earlier than the last one recorded is a clock that moved backwards, not a new
  // day: the streak is left alone rather than rebuilt from a date we cannot trust.
  if (gap !== null && gap < 0) return streak;

  const currentDays = gap === 1 ? streak.currentDays + 1 : 1;
  return {
    currentDays,
    bestDays: Math.max(streak.bestDays, currentDays),
    lastPlayedOn: playedOn
  };
}

/**
 * The streak as it stands today, without writing anything. A streak that was broken
 * while the app was closed must read as broken the moment it is opened again.
 */
export function getStreakToday(streak: Streak, today: string): Streak {
  if (!isPlayedOn(today) || !streak.lastPlayedOn) return streak;
  const gap = getDaysBetween(streak.lastPlayedOn, today);
  if (gap === null || gap <= 1) return streak;
  return { ...streak, currentDays: 0 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDayCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.trunc(value);
}

/** Rebuilds a stored streak, falling back to no streak rather than to a made-up one. */
export function parseStreak(value: unknown): Streak {
  if (!isRecord(value)) return initialStreak;

  const lastPlayedOn = isPlayedOn(value.lastPlayedOn) ? value.lastPlayedOn : null;
  const currentDays = lastPlayedOn === null ? 0 : parseDayCount(value.currentDays);
  return {
    currentDays,
    bestDays: Math.max(currentDays, parseDayCount(value.bestDays)),
    lastPlayedOn
  };
}
