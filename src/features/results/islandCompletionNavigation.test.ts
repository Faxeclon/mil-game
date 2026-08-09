import { describe, expect, it } from "vitest";
import { getContinueDestination } from "@/features/levels/levelProgress";
import {
  getCategoriesByIsland,
  getMissionsByCategory,
  islands,
  type IslandKey,
  type LevelId
} from "@/features/levels/levelModel";
import { initialProgressState, type ProgressState } from "@/features/progress/progressState";
import { getContinuePath } from "./resultNavigation";

function withCompleted(...levelIds: LevelId[]): ProgressState {
  return { ...initialProgressState, completedLevelIds: levelIds };
}

/** Every mission with content in an island, in the order a player meets them. */
function missionsOf(island: IslandKey): LevelId[] {
  return getCategoriesByIsland(island).flatMap((category) =>
    getMissionsByCategory(category.key)
      .filter((mission) => mission.packId)
      .map((mission) => mission.id as LevelId)
  );
}

/** Every island in order, so a new one is covered without editing this file. */
const playableIslands = [...islands]
  .sort((a, b) => a.order - b.order)
  .map((island) => island.key)
  .filter((island) => missionsOf(island).length > 0);

describe("finishing the last mission of an island", () => {
  /*
   * The behaviour this replaces swept the child straight into the next island, so the
   * hundred per cent and any Rush they had just earned happened behind them.
   */
  it("keeps a manually restored completed island on its own view", () => {
    for (const island of playableIslands) {
      const missions = missionsOf(island);
      const everythingUpToHere = playableIslands
        .slice(0, playableIslands.indexOf(island) + 1)
        .flatMap(missionsOf);

      expect(getContinueDestination(withCompleted(...everythingUpToHere), missions.at(-1)!), island).toEqual({ kind: "island", islandKey: island });
    }
  });

  it("does the same for the very first island, which is where most players see it", () => {
    const training = missionsOf("training");

    expect(getContinueDestination(withCompleted(...training), training.at(-1)!)).toEqual({ kind: "island", islandKey: "training" });
  });

  it("keeps the island path safe without a fresh completion event", () => {
    const training = missionsOf("training");

    expect(getContinuePath(withCompleted(...training), training.at(-1)!)).toBe("/island/training");
  });
});

describe("finishing a mission with more left in the island", () => {
  it("carries straight on to the next one", () => {
    const [first, second] = missionsOf("training");

    expect(getContinueDestination(withCompleted(first), first)).toEqual({ kind: "level", levelId: second });
  });

  it("does not stop at the island just because a later island is untouched", () => {
    const difference = missionsOf("difference");
    // Training finished and the first mission of the next island done: there is more here.
    const state = withCompleted(...missionsOf("training"), difference[0]);

    expect(getContinueDestination(state, difference[0])).toEqual({
      kind: "level",
      levelId: difference[1]
    });
  });

  it("keeps pointing forward when a mission is replayed midway through an island", () => {
    const training = missionsOf("training");
    const difference = missionsOf("difference");
    const state = withCompleted(...training, difference[0]);

    // Replaying the first mission of training must not read as finishing training again:
    // the island is complete, so the island page is still the honest destination.
    expect(getContinueDestination(state, training[0])).toEqual({ kind: "island", islandKey: "training" });
  });
});

describe("destinations that have to stay safe", () => {
  it("falls back to the map for a mission that does not exist", () => {
    expect(getContinueDestination(initialProgressState, "ghost-level")).toEqual({ kind: "worlds" });
    expect(getContinuePath(initialProgressState, "ghost-level" as LevelId)).toBe("/worlds");
  });

  it("never sends a player to an island that is not theirs", () => {
    const training = missionsOf("training");
    const destination = getContinueDestination(withCompleted(...training), training.at(-1)!);

    expect(destination).toEqual({ kind: "island", islandKey: "training" });
  });
});
