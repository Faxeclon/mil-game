import { isLevelId, type LevelId } from "@/features/levels/levelModel";
import { isAttemptId, parseCompletedAt, parseElapsedMs } from "./attemptMetadata";
import { parseLevelScore } from "@/features/scoring/levelScore";

/**
 * The local record for one mission. It is a keepsake, never a source of truth for the
 * map: whether a level is unlocked comes only from `completedLevelIds`.
 */
export type BestResult = {
  score: number;
  correctRounds: number;
  totalRounds: number;
  elapsedMs: number | null;
  attemptId: string | null;
  completedAt: string | null;
};

export type BestResultsByLevelId = Partial<Record<LevelId, BestResult>>;

type Candidate = {
  score: number;
  correctRounds: number;
  totalRounds: number;
  elapsedMs: number | null;
  attemptId?: string | null;
  completedAt?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Decides whether a finished attempt replaces the stored record.
 *
 * A newer attempt is not automatically better: only a real improvement takes the record,
 * so a child can replay freely without ever losing their best run. Ties fall back to
 * more correct answers, then to the quicker run, and finally keep what was already there.
 */
export function isBetterThanRecord(candidate: Candidate, record: BestResult | undefined): boolean {
  if (!record) return true;
  if (candidate.score !== record.score) return candidate.score > record.score;
  if (candidate.correctRounds !== record.correctRounds) {
    return candidate.correctRounds > record.correctRounds;
  }

  // A missing time cannot claim to be faster than a measured one.
  if (candidate.elapsedMs === null) return false;
  if (record.elapsedMs === null) return true;
  return candidate.elapsedMs < record.elapsedMs;
}

function toBestResult(candidate: Candidate): BestResult {
  return {
    score: candidate.score,
    correctRounds: candidate.correctRounds,
    totalRounds: candidate.totalRounds,
    elapsedMs: candidate.elapsedMs ?? null,
    attemptId: candidate.attemptId ?? null,
    completedAt: candidate.completedAt ?? null
  };
}

/**
 * Returns the records with this attempt folded in. The same object is returned when the
 * attempt did not beat the record, so nothing re-renders for a run that changed nothing.
 */
export function updateBestResults(
  records: BestResultsByLevelId,
  levelId: LevelId,
  candidate: Candidate
): BestResultsByLevelId {
  if (!isLevelId(levelId)) return records;
  if (!isBetterThanRecord(candidate, records[levelId])) return records;
  return { ...records, [levelId]: toBestResult(candidate) };
}

/** True when this attempt set a new record, used only to congratulate the player. */
export function isNewRecord(records: BestResultsByLevelId, levelId: LevelId, attemptId: string | null): boolean {
  if (!attemptId) return false;
  return records[levelId]?.attemptId === attemptId;
}

function parseBestResult(value: unknown): BestResult | undefined {
  if (!isRecord(value)) return undefined;

  const score = parseLevelScore(value.score);
  const { correctRounds, totalRounds } = value;
  if (score === null) return undefined;
  if (typeof correctRounds !== "number" || typeof totalRounds !== "number") return undefined;
  if (!Number.isFinite(correctRounds) || !Number.isFinite(totalRounds) || totalRounds <= 0) return undefined;

  return {
    score,
    correctRounds: Math.min(Math.max(Math.trunc(correctRounds), 0), Math.trunc(totalRounds)),
    totalRounds: Math.trunc(totalRounds),
    elapsedMs: parseElapsedMs(value.elapsedMs),
    attemptId: isAttemptId(value.attemptId) ? value.attemptId : null,
    completedAt: parseCompletedAt(value.completedAt)
  };
}

/**
 * Rebuilds the records from stored data. Unknown levels and malformed entries are
 * dropped rather than repaired, and a corrupt file simply means no records yet.
 */
export function parseBestResults(value: unknown): BestResultsByLevelId {
  if (!isRecord(value)) return {};

  const records: BestResultsByLevelId = {};
  for (const [levelId, entry] of Object.entries(value)) {
    if (!isLevelId(levelId)) continue;
    const record = parseBestResult(entry);
    if (record) records[levelId] = record;
  }
  return records;
}

export function getBestResult(records: BestResultsByLevelId, levelId: string): BestResult | undefined {
  return isLevelId(levelId) ? records[levelId] : undefined;
}
