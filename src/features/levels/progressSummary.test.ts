import { describe, expect, it } from "vitest";
import { initialProgressState, type ProgressState } from "@/features/progress/progressState";
import { getIslandOfMission, missionBlueprint, type LevelId } from "./levelModel";
import {
  getCategoryProgress,
  getGlobalProgress,
  getIslandProgress,
  isIslandRushUnlocked,
  getMissionRequirement,
  getMissionRequirementById,
  playableMissionOrder
} from "./progressSummary";

function withCompleted(...levelIds: LevelId[]): ProgressState {
  return { ...initialProgressState, completedLevelIds: levelIds };
}

function mission(id: string) {
  const found = missionBlueprint.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown mission in test: ${id}`);
  return found;
}

/** Every mission that has content, in catalog order. */
function playableIds(): LevelId[] {
  return missionBlueprint.filter((entry) => entry.packId).map((entry) => entry.id as LevelId);
}

describe("the playable path", () => {
  it("lists only missions that have content, in the order a player meets them", () => {
    expect(playableMissionOrder.every((entry) => Boolean(entry.packId))).toBe(true);
    // The first island opens the game and the last one closes it; the middle is content.
    expect(playableMissionOrder.map((entry) => entry.id)).toEqual(playableIds());
    expect(playableMissionOrder.at(0)?.id).toBe("basics-1");
    expect(playableMissionOrder.at(-1)?.category).toBe("clips");
  });
});

describe("progress of an island", () => {
  it("counts every playable mission of the island, and only those", () => {
    const inIsland = playableIds().filter((id) => getIslandOfMission(id) === "difference");
    const summary = getIslandProgress(withCompleted(...inIsland), "difference");

    expect(summary).toMatchObject({
      done: inIsland.length,
      total: inIsland.length,
      percent: 100,
      isComplete: true,
      isEmpty: false
    });
  });

  it("reports a partly finished island as a whole percentage", () => {
    const total = playableIds().filter((id) => getIslandOfMission(id) === "difference").length;

    expect(getIslandProgress(withCompleted("animals-1"), "difference")).toMatchObject({
      done: 1,
      total,
      percent: Math.round((1 / total) * 100)
    });
  });

  it("reports an untouched island as zero without ever looking complete", () => {
    expect(getIslandProgress(initialProgressState, "training")).toMatchObject({
      done: 0,
      total: 2,
      percent: 0,
      isComplete: false
    });
  });

  it("treats an island with nothing playable as empty instead of dividing by zero", () => {
    // Every authored island has content now, so the guarantee is checked against an
    // island key that does not exist: the same code path, with nothing behind it.
    const summary = getIslandProgress(initialProgressState, "ghost-island" as never);

    expect(summary).toMatchObject({ done: 0, total: 0, percent: 0, isEmpty: true, isComplete: false });
    expect(Number.isFinite(summary.percent)).toBe(true);
  });

  it("ignores a completion stored for a mission of another island", () => {
    expect(getIslandProgress(withCompleted("basics-1"), "difference").done).toBe(0);
  });
});

describe("Rush access", () => {
  it("uses the same playable-mission completion rule as the island view", () => {
    expect(isIslandRushUnlocked(withCompleted("basics-1"), "training")).toBe(false);
    expect(isIslandRushUnlocked(withCompleted("basics-1", "basics-2"), "training")).toBe(true);
  });

  it("does not unlock unknown or empty islands", () => {
    expect(isIslandRushUnlocked(initialProgressState, "ghost-island")).toBe(false);
  });
});

describe("progress of a category and of the whole game", () => {
  it("summarises a category on its own", () => {
    expect(getCategoryProgress(withCompleted("animals-1"), "animals")).toMatchObject({
      done: 1,
      total: 3,
      percent: 33
    });
  });

  it("summarises every playable mission of the game", () => {
    // Read from the catalog, so adding a mission is a content change and not a test edit.
    const total = playableIds().length;

    expect(getGlobalProgress(initialProgressState)).toMatchObject({ done: 0, total, percent: 0 });
    expect(getGlobalProgress(withCompleted("basics-1", "basics-2"))).toMatchObject({
      done: 2,
      total,
      percent: Math.round((2 / total) * 100)
    });
  });

  it("reaches a hundred per cent only when every playable mission is done", () => {
    const everything = withCompleted(...playableIds());

    expect(getGlobalProgress(everything)).toMatchObject({ percent: 100, isComplete: true });
  });
});

describe("what a mission is waiting for", () => {
  it("calls the first mission available from the very start", () => {
    expect(getMissionRequirement(initialProgressState, mission("basics-1"))).toEqual({ kind: "available" });
  });

  it("calls a finished mission completed, so it can still be replayed", () => {
    expect(getMissionRequirement(withCompleted("basics-1"), mission("basics-1"))).toEqual({ kind: "completed" });
  });

  it("names the mission directly before it, which is the one drawn right above on the map", () => {
    expect(getMissionRequirement(initialProgressState, mission("animals-1"))).toEqual({
      kind: "requiresMission",
      missionId: "basics-2"
    });
    expect(getMissionRequirement(withCompleted("basics-1"), mission("animals-2"))).toEqual({
      kind: "requiresMission",
      missionId: "animals-1"
    });
  });

  it("skips over missions already finished when naming what is missing", () => {
    // animals-1 is done, so the mission still owed is the earlier basics-2.
    expect(getMissionRequirement(withCompleted("animals-1"), mission("animals-2"))).toEqual({
      kind: "requiresMission",
      missionId: "basics-2"
    });
  });

  it("tells a mission with no content apart from one locked by progress", () => {
    // Every authored mission has content now, so the rule is checked against a mission
    // whose pack has been taken away rather than against a real one.
    const contentless = { ...mission("animals-3"), packId: undefined };

    expect(getMissionRequirement(initialProgressState, contentless)).toEqual({ kind: "comingSoon" });
    expect(getMissionRequirement(initialProgressState, mission("animals-3"))).toEqual({
      kind: "requiresMission",
      missionId: "animals-2"
    });
  });

  it("opens the next mission as soon as the one before it is finished", () => {
    expect(getMissionRequirement(withCompleted("basics-1"), mission("basics-2"))).toEqual({ kind: "available" });
  });

  it("answers safely for a mission id that does not exist", () => {
    expect(getMissionRequirementById(initialProgressState, "ghost-level")).toEqual({ kind: "locked" });
  });
});
