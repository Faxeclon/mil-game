import { describe, expect, it } from "vitest";
import {
  categories,
  getCategoriesByIsland,
  getIslandOfMission,
  getLevelDifficulty,
  getMissionById,
  getMissionsByCategory,
  islandOrder,
  islands,
  isComparisonMode,
  isSingleMode,
  isTimedMode,
  levelModes,
  missionBlueprint
} from "./levelModel";

describe("island, category and mission blueprint", () => {
  it("gives every island, category and mission a unique key", () => {
    for (const keys of [
      islands.map((island) => island.key),
      categories.map((category) => category.key),
      missionBlueprint.map((mission) => mission.id)
    ]) {
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("attaches every category to a declared island", () => {
    const islandKeys = islands.map((island) => island.key);
    for (const category of categories) {
      expect(islandKeys).toContain(category.island);
    }
  });

  it("attaches every mission to a declared category", () => {
    const categoryKeys = categories.map((category) => category.key);
    for (const mission of missionBlueprint) {
      expect(categoryKeys).toContain(mission.category);
    }
  });

  it("numbers the missions of a category from one, without gaps", () => {
    for (const category of categories) {
      const missions = getMissionsByCategory(category.key);
      expect(missions.map((mission) => mission.order)).toEqual(missions.map((_, index) => index + 1));
    }
  });

  it("orders islands and their categories", () => {
    // Training opens the game; the rest are content and may grow.
    expect(islandOrder.at(0)).toBe("training");
    expect(islandOrder).toEqual([...islands].sort((a, b) => a.order - b.order).map((island) => island.key));
    expect(getCategoriesByIsland("difference").map((category) => category.key)).toEqual([
      "animals",
      "sports",
      "memes"
    ]);
  });

  it("only uses supported modes", () => {
    for (const mission of missionBlueprint) {
      expect(levelModes).toContain(mission.mode);
    }
  });

  it("gives every timed mission a time limit, and no untimed one", () => {
    for (const mission of missionBlueprint) {
      if (isTimedMode(mission.mode)) {
        expect(mission.secondsPerRound).toBeGreaterThan(0);
      } else {
        expect(mission.secondsPerRound).toBeUndefined();
      }
    }
  });

  it("resolves a mission back to its island", () => {
    expect(getIslandOfMission("basics-1")).toBe("training");
    expect(getIslandOfMission("animals-1")).toBe("difference");
    expect(getIslandOfMission("sports-2")).toBe("difference");
    expect(getIslandOfMission("does-not-exist")).toBeUndefined();
  });

  it("finds a mission by id and reports nothing for an unknown one", () => {
    expect(getMissionById("basics-2")?.mode).toBe("compare-timed");
    expect(getMissionById("ghost")).toBeUndefined();
  });
});

describe("mode helpers", () => {
  it("derives difficulty from the mode, rising with the ladder", () => {
    expect(getLevelDifficulty("compare")).toBe("easy");
    expect(getLevelDifficulty("compare-timed")).toBe("medium");
    expect(getLevelDifficulty("single")).toBe("medium");
    expect(getLevelDifficulty("single-uncertain")).toBe("hard");
    expect(getLevelDifficulty("meme")).toBe("hard");
  });

  it("separates two-image modes from single-image ones", () => {
    expect(isComparisonMode("compare")).toBe(true);
    expect(isComparisonMode("compare-timed")).toBe(true);
    expect(isComparisonMode("single")).toBe(false);

    expect(isSingleMode("single")).toBe(true);
    expect(isSingleMode("single-uncertain")).toBe(true);
    expect(isSingleMode("compare")).toBe(false);
  });
});
