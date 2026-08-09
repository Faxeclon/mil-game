import { describe, expect, it } from "vitest";
import { getBonusRushSecondsLeft } from "@/features/bonus/bonusOpportunity";

const run = {
  runId: "animals:attempt-1:run",
  startedAt: 1_000,
  reward: "none" as const,
  durationSeconds: 30,
  deckItemIds: ["animals-1-r1-ai", "animals-1-r1-real"],
  index: 1,
  rawCorrectCount: 1,
  actualMistakeCount: 0,
  visibleMistakeCount: 0,
  shieldUsed: false,
  score: 1,
  finished: false,
  ranOut: false
};

describe("persisted Bonus Rush timing", () => {
  it("continues from the original start time instead of resetting on refresh", () => {
    expect(getBonusRushSecondsLeft(run.startedAt, 30, 11_000)).toBe(20);
    expect(getBonusRushSecondsLeft(run.startedAt, 30, 40_000)).toBe(0);
  });

  it("keeps a time reward's total duration after refresh", () => {
    expect(getBonusRushSecondsLeft(run.startedAt, 45, 11_000)).toBe(35);
    expect(getBonusRushSecondsLeft(run.startedAt, 45, 46_000)).toBe(0);
  });
});
