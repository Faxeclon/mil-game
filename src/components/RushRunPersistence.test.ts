import { describe, expect, it } from "vitest";
import { getBonusRushSecondsLeft } from "@/features/bonus/bonusOpportunity";

const run = {
  runId: "animals:attempt-1:run",
  startedAt: 1_000,
  deckItemIds: ["animals-1-r1-ai", "animals-1-r1-real"],
  index: 1,
  correct: 1,
  wrong: 0,
  finished: false,
  ranOut: false
};

describe("persisted Bonus Rush timing", () => {
  it("continues from the original start time instead of resetting on refresh", () => {
    expect(getBonusRushSecondsLeft(run.startedAt, 30, 11_000)).toBe(20);
    expect(getBonusRushSecondsLeft(run.startedAt, 30, 40_000)).toBe(0);
  });
});
