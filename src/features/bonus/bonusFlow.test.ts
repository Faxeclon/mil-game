import { describe, expect, it } from "vitest";
import type { BonusOpportunity } from "./bonusOpportunity";
import { getBonusFlowStage } from "./bonusFlow";

const active: BonusOpportunity = {
  id: "bonus-1",
  categoryKey: "animals",
  islandKey: "difference",
  destination: { kind: "island", islandKey: "difference" },
  status: "active"
};

describe("persisted Bonus flow", () => {
  it("only shows the wheel before its resolved reward has been acknowledged", () => {
    expect(getBonusFlowStage(active, false)).toBe("wheel");
    const resolved = { ...active, wheel: { status: "resolved" as const, rerollUsed: false, reward: "none" as const } };
    expect(getBonusFlowStage(resolved, false)).toBe("wheel");
    expect(getBonusFlowStage(resolved, true)).toBe("lobby");
  });

  it("uses the persisted run to survive refresh without reopening the wheel", () => {
    const running = {
      ...active,
      wheel: { status: "resolved" as const, rerollUsed: false, reward: "double-points" as const },
      rushRun: {
        runId: "bonus-1:run", startedAt: 1, reward: "double-points" as const, durationSeconds: 30, deckItemIds: ["one"], index: 0,
        rawCorrectCount: 0, actualMistakeCount: 0, visibleMistakeCount: 0, shieldUsed: false, score: 0, finished: false, ranOut: false
      }
    };
    expect(getBonusFlowStage(running, false)).toBe("run");
    expect(getBonusFlowStage({ ...running, rushRun: { ...running.rushRun, finished: true } }, false)).toBe("result");
  });

  it("closes a consumed opportunity instead of reviving a prior screen", () => {
    expect(getBonusFlowStage({ ...active, status: "consumed" }, true)).toBe("closed");
  });
});
