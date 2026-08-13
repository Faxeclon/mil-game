import { describe, expect, it } from "vitest";
import { addAchievements, getBonusRunAchievementIds, getIslandCompletionAchievementIds, getNewAchievementIds } from "./achievementModel";

describe("Bonus achievements", () => {
  it.each([
    ["training", "bonus-perfect-training"],
    ["difference", "bonus-perfect-difference"]
  ] as const)("unlocks the island achievement for a perfect %s run", (islandKey, achievementId) => {
    expect(getBonusRunAchievementIds({ islandKey, actualMistakeCount: 0, reward: "none" })).toEqual([achievementId]);
  });

  it("reserves Videos and Deciding achievements for their first island completion", () => {
    expect(getBonusRunAchievementIds({ islandKey: "videos", actualMistakeCount: 0, reward: "none" })).toEqual([]);
    expect(getBonusRunAchievementIds({ islandKey: "decisions", actualMistakeCount: 0, reward: "none" })).toEqual([]);
    expect(getIslandCompletionAchievementIds("videos")).toEqual(["bonus-perfect-videos"]);
    expect(getIslandCompletionAchievementIds("decisions")).toEqual(["bonus-perfect-decisions"]);
    expect(getIslandCompletionAchievementIds("training")).toEqual([]);
  });

  it("never treats a shielded or other real error as perfect", () => {
    expect(getBonusRunAchievementIds({ islandKey: "training", actualMistakeCount: 1, reward: "extra-life" })).toEqual([]);
  });

  it("awards both the island achievement and Eggspert for a perfect double-points run", () => {
    expect(getBonusRunAchievementIds({ islandKey: "difference", actualMistakeCount: 0, reward: "double-points" }))
      .toEqual(["bonus-perfect-difference", "bonus-eggspert"]);
    expect(getBonusRunAchievementIds({ islandKey: "difference", actualMistakeCount: 1, reward: "double-points" })).toEqual([]);
  });

  it("is idempotent when a profile has already earned an achievement", () => {
    expect(getNewAchievementIds(["bonus-perfect-training"], ["bonus-perfect-training"])) .toEqual([]);
    expect(addAchievements(["bonus-perfect-training"], ["bonus-perfect-training", "bonus-eggspert"]))
      .toEqual(["bonus-perfect-training", "bonus-eggspert"]);
    expect(addAchievements([], ["bonus-eggspert", "bonus-eggspert"])).toEqual(["bonus-eggspert"]);
  });
});
