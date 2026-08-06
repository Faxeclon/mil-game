import {
  getBestResult,
  isNewRecord as attemptHoldsRecord,
  type BestResultsByLevelId
} from "@/features/progress/bestResults";
import type { LevelResult } from "@/features/progress/progressState";
import { getStarCount, MAX_LEVEL_SCORE } from "@/features/scoring/levelScore";

/**
 * Everything the results screen needs to talk about a score, decided here rather than
 * in the markup. A missing score is reported as missing: the screen never fills the gap
 * with a zero or with somebody else's number.
 */
export type ScoreSummary = {
  /** Null for an attempt recorded before scoring existed. */
  score: number | null;
  stars: 0 | 1 | 2 | 3;
  maxScore: number;
  /** The mission's local record, if there is one at all. */
  best: number | null;
  bestStars: 0 | 1 | 2 | 3;
  /** True only when this very attempt is the one currently holding the record. */
  isNewRecord: boolean;
  /** The record is worth showing apart only when it is not this attempt's own number. */
  showsBest: boolean;
};

export function getScoreSummary(
  result: Pick<LevelResult, "levelId" | "attemptId" | "score">,
  records: BestResultsByLevelId
): ScoreSummary {
  const record = getBestResult(records, result.levelId);
  const best = record?.score ?? null;
  const isNewRecord = attemptHoldsRecord(records, result.levelId, result.attemptId);

  return {
    score: result.score,
    stars: result.score === null ? 0 : getStarCount(result.score),
    maxScore: MAX_LEVEL_SCORE,
    best,
    bestStars: best === null ? 0 : getStarCount(best),
    isNewRecord,
    showsBest: best !== null && !isNewRecord
  };
}
