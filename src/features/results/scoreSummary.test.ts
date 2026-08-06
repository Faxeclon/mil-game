import { describe, expect, it } from "vitest";
import { updateBestResults, type BestResultsByLevelId } from "@/features/progress/bestResults";
import type { LevelResult } from "@/features/progress/progressState";
import { getScoreSummary } from "./scoreSummary";

const attemptId = "attempt_123e4567-e89b-12d3-a456-426614174000";
const otherAttemptId = "attempt_223e4567-e89b-12d3-a456-426614174000";

const result: LevelResult = {
  levelId: "animals-1",
  attemptId,
  correctRounds: 2,
  totalRounds: 3,
  elapsedMs: 12_000,
  completedAt: "2025-01-02T03:04:05.000Z",
  score: 840
};

function recordsWith(score: number, holder = attemptId): BestResultsByLevelId {
  return updateBestResults({}, "animals-1", {
    score,
    correctRounds: 3,
    totalRounds: 3,
    elapsedMs: 9_000,
    attemptId: holder,
    completedAt: "2025-01-02T03:04:05.000Z"
  });
}

describe("the score of the attempt on screen", () => {
  it("reports the attempt's own score with its stars", () => {
    const summary = getScoreSummary(result, {});

    expect(summary.score).toBe(840);
    expect(summary.stars).toBe(2);
    expect(summary.maxScore).toBe(1_000);
  });

  it("says a result has no score instead of showing a zero", () => {
    const summary = getScoreSummary({ ...result, score: null }, {});

    expect(summary.score).toBeNull();
    expect(summary.stars).toBe(0);
  });

  it("never borrows the record when the attempt itself has no score", () => {
    const summary = getScoreSummary({ ...result, score: null }, recordsWith(920, otherAttemptId));

    expect(summary.score).toBeNull();
    expect(summary.best).toBe(920);
    expect(summary.isNewRecord).toBe(false);
  });
});

describe("the mission record on screen", () => {
  it("shows the record of an earlier, better attempt", () => {
    const summary = getScoreSummary(result, recordsWith(920, otherAttemptId));

    expect(summary.best).toBe(920);
    expect(summary.bestStars).toBe(3);
    expect(summary.showsBest).toBe(true);
    expect(summary.isNewRecord).toBe(false);
  });

  it("celebrates the attempt that holds the record, without repeating the number", () => {
    const summary = getScoreSummary(result, recordsWith(840));

    expect(summary.isNewRecord).toBe(true);
    expect(summary.showsBest).toBe(false);
  });

  it("has no record to show for a mission never recorded", () => {
    const summary = getScoreSummary(result, {});

    expect(summary.best).toBeNull();
    expect(summary.showsBest).toBe(false);
    expect(summary.isNewRecord).toBe(false);
  });

  it("does not read another mission's record", () => {
    const summary = getScoreSummary({ ...result, levelId: "animals-2" }, recordsWith(920));

    expect(summary.best).toBeNull();
    expect(summary.isNewRecord).toBe(false);
  });

  it("stops celebrating once a later attempt takes the record over", () => {
    const records = updateBestResults(recordsWith(840), "animals-1", {
      score: 990,
      correctRounds: 3,
      totalRounds: 3,
      elapsedMs: 5_000,
      attemptId: otherAttemptId,
      completedAt: "2025-01-02T03:05:05.000Z"
    });
    const summary = getScoreSummary(result, records);

    expect(summary.isNewRecord).toBe(false);
    expect(summary.best).toBe(990);
    expect(summary.showsBest).toBe(true);
  });

  it("keeps celebrating on reload, because the record remembers the attempt", () => {
    const records = recordsWith(840);

    // A reload rebuilds the screen from the same stored records and the same URL attempt.
    expect(getScoreSummary(result, records).isNewRecord).toBe(true);
    expect(getScoreSummary(result, records).isNewRecord).toBe(true);
  });

  it("cannot celebrate a result with no attempt identity", () => {
    const summary = getScoreSummary({ ...result, attemptId: null }, recordsWith(840));

    expect(summary.isNewRecord).toBe(false);
  });
});
