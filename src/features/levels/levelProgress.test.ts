import { describe, expect, it } from "vitest";
import type { LevelId } from "@/features/levels/levelModel";
import { completeLevel, initialProgressState, type LevelAttempt, type ProgressState } from "@/features/progress/progressState";
import {
  countCategoryProgress,
  countCompletedMissions,
  countPlayableMissions,
  getAvailableCategory,
  getAvailableIsland,
  getAvailableMission,
  getCategoryState,
  getIslandState,
  getMissionState,
  getPlayableMissions,
  isMissionUnlocked,
  playableIslandOrder
} from "./levelProgress";
import { getMissionById } from "./levelModel";

/** Plays through a list of mission ids in order. */
function play(...missionIds: LevelId[]): ProgressState {
  return missionIds.reduce(
    (state, missionId, index) => completeLevel(state, missionId, attempt(index)),
    initialProgressState
  );
}

function attempt(index: number): LevelAttempt {
  return {
    attemptId: `attempt_progress-${index.toString().padStart(8, "0")}`,
    correctRounds: 0,
    totalRounds: 1,
    elapsedMs: 0,
    completedAt: "2025-01-02T03:04:05.000Z"
  };
}

describe("islands", () => {
  it("only treats an island with playable missions as playable", () => {
    expect(playableIslandOrder).toEqual(["training", "difference"]);
  });

  it("opens the first island and closes the rest", () => {
    expect(getIslandState(initialProgressState, "training")).toBe("available");
    expect(getIslandState(initialProgressState, "difference")).toBe("locked");
    expect(getIslandState(initialProgressState, "source")).toBe("locked");
  });

  it("opens the next island only when the previous one is finished", () => {
    const halfway = play("basics-1");
    expect(getIslandState(halfway, "training")).toBe("available");
    expect(getIslandState(halfway, "difference")).toBe("locked");

    const finished = play("basics-1", "basics-2");
    expect(getIslandState(finished, "training")).toBe("completed");
    expect(getIslandState(finished, "difference")).toBe("available");
    expect(getAvailableIsland(finished)).toBe("difference");
  });
});

describe("categories inside an island", () => {
  it("opens only the first category of the open island", () => {
    const state = play("basics-1", "basics-2");

    expect(getCategoryState(state, "animals")).toBe("available");
    expect(getCategoryState(state, "sports")).toBe("locked");
    expect(getAvailableCategory(state, "difference")).toBe("animals");
  });

  it("moves to the next category when the previous one is finished", () => {
    // The third animals mission has no content, so the category is done after two.
    const state = play("basics-1", "basics-2", "animals-1", "animals-2");

    expect(getCategoryState(state, "animals")).toBe("completed");
    expect(getCategoryState(state, "sports")).toBe("available");
  });

  it("counts progress inside a category", () => {
    const state = play("basics-1", "basics-2", "animals-1");
    expect(countCategoryProgress(state, "animals")).toEqual({ done: 1, total: 2 });
  });
});

describe("missions inside a category", () => {
  it("ignores missions that have no content yet", () => {
    // animals-3 is declared but has no pack, so it is not part of the playable chain.
    expect(getPlayableMissions("animals").map((mission) => mission.id)).toEqual([
      "animals-1",
      "animals-2"
    ]);
  });

  it("opens only the first unfinished mission", () => {
    const state = play("basics-1", "basics-2");
    const first = getMissionById("animals-1")!;
    const second = getMissionById("animals-2")!;

    expect(getMissionState(state, first)).toBe("available");
    expect(getMissionState(state, second)).toBe("locked");
    expect(getAvailableMission(state, "animals")?.id).toBe("animals-1");
  });

  it("keeps a finished mission open so it can be replayed", () => {
    const state = play("basics-1");
    expect(isMissionUnlocked(state, "basics-1")).toBe(true);
  });

  it("blocks a mission that has not been reached, and an unknown one", () => {
    expect(isMissionUnlocked(initialProgressState, "animals-1")).toBe(false);
    expect(isMissionUnlocked(initialProgressState, "ghost-mission")).toBe(false);
  });
});

describe("counters", () => {
  it("counts finished missions against the playable total", () => {
    expect(countCompletedMissions(initialProgressState)).toBe(0);
    expect(countPlayableMissions()).toBe(5);
    expect(countCompletedMissions(play("basics-1", "animals-1"))).toBe(2);
  });

  it("does not count a mission twice", () => {
    const twice = completeLevel(play("basics-1"), "basics-1", attempt(2));
    expect(countCompletedMissions(twice)).toBe(1);
  });
});
