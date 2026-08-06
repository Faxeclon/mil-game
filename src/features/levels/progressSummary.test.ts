import { describe, expect, it } from "vitest";
import { initialProgressState, type ProgressState } from "@/features/progress/progressState";
import { missionBlueprint, type LevelId } from "./levelModel";
import {
  getCategoryProgress,
  getGlobalProgress,
  getIslandProgress,
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

describe("the playable path", () => {
  it("lists only missions that have content, in the order a player meets them", () => {
    expect(playableMissionOrder.every((entry) => Boolean(entry.packId))).toBe(true);
    expect(playableMissionOrder.map((entry) => entry.id)).toEqual([
      "basics-1",
      "basics-2",
      "animals-1",
      "animals-2",
      "sports-1"
    ]);
  });
});

describe("progress of an island", () => {
  it("counts only playable missions, so a coming-soon one cannot lower the percentage", () => {
    // The "difference" island declares animals-3 and sports-2 without content.
    const summary = getIslandProgress(withCompleted("animals-1", "animals-2", "sports-1"), "difference");

    expect(summary).toMatchObject({ done: 3, total: 3, percent: 100, isComplete: true, isEmpty: false });
  });

  it("reports a partly finished island as a whole percentage", () => {
    expect(getIslandProgress(withCompleted("animals-1"), "difference")).toMatchObject({
      done: 1,
      total: 3,
      percent: 33
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
    const summary = getIslandProgress(initialProgressState, "source");

    expect(summary).toMatchObject({ done: 0, total: 0, percent: 0, isEmpty: true, isComplete: false });
    expect(Number.isFinite(summary.percent)).toBe(true);
  });

  it("ignores a completion stored for a mission of another island", () => {
    expect(getIslandProgress(withCompleted("basics-1"), "difference").done).toBe(0);
  });
});

describe("progress of a category and of the whole game", () => {
  it("summarises a category on its own", () => {
    expect(getCategoryProgress(withCompleted("animals-1"), "animals")).toMatchObject({
      done: 1,
      total: 2,
      percent: 50
    });
  });

  it("summarises every playable mission of the game", () => {
    expect(getGlobalProgress(initialProgressState)).toMatchObject({ done: 0, total: 5, percent: 0 });
    expect(getGlobalProgress(withCompleted("basics-1", "basics-2"))).toMatchObject({
      done: 2,
      total: 5,
      percent: 40
    });
  });

  it("reaches a hundred per cent only when every playable mission is done", () => {
    const everything = withCompleted("basics-1", "basics-2", "animals-1", "animals-2", "sports-1");

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
    const everything = withCompleted("basics-1", "basics-2", "animals-1", "animals-2", "sports-1");

    expect(getMissionRequirement(everything, mission("animals-3"))).toEqual({ kind: "comingSoon" });
    expect(getMissionRequirement(initialProgressState, mission("animals-3"))).toEqual({ kind: "comingSoon" });
  });

  it("opens the next mission as soon as the one before it is finished", () => {
    expect(getMissionRequirement(withCompleted("basics-1"), mission("basics-2"))).toEqual({ kind: "available" });
  });

  it("answers safely for a mission id that does not exist", () => {
    expect(getMissionRequirementById(initialProgressState, "ghost-level")).toEqual({ kind: "locked" });
  });
});
