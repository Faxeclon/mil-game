import { describe, expect, it } from "vitest";
import { completeLevel, initialProgressState } from "@/features/progress/progressState";
import { getContinuePath, getReplayPath, getResultsAttemptPath } from "./resultNavigation";

const attempt = {
  attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
  correctRounds: 1,
  totalRounds: 3,
  elapsedMs: 8_000,
  completedAt: "2025-01-02T03:04:05.000Z"
};

describe("result navigation", () => {
  it("uses the exact persisted attempt id in the localized results-relative path", () => {
    const state = completeLevel(initialProgressState, "basics-1", attempt);
    expect(getResultsAttemptPath(state.lastResult!.attemptId!)).toBe(
      "/results?attempt=attempt_123e4567-e89b-12d3-a456-426614174000"
    );
  });

  it("replays the exact completed level", () => {
    expect(getReplayPath("animals-1")).toBe("/level/animals-1");
  });

  it("continues with canonical progress and falls back to the completed level's island", () => {
    const afterBasicsOne = completeLevel(initialProgressState, "basics-1", attempt);
    const playableLevelIds = ["basics-1", "basics-2", "animals-1", "animals-2", "sports-1"] as const;
    const completedAllPlayable = playableLevelIds.reduce(
      (state, levelId, index) => completeLevel(state, levelId, { ...attempt, attemptId: `attempt_result-${index}` }),
      initialProgressState
    );

    expect(getContinuePath(afterBasicsOne, "basics-1")).toBe("/level/basics-2");
    expect(getContinuePath(completedAllPlayable, "sports-1")).toBe("/island/difference");
  });
});
