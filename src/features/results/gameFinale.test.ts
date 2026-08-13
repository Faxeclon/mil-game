import { describe, expect, it } from "vitest";
import { initialProgressState, type ProgressState } from "@/features/progress/progressState";
import { islands, type LevelId } from "@/features/levels/levelModel";
import { playableMissionOrder } from "@/features/levels/progressSummary";
import { getGameFinale, hasFinishedEveryMission } from "./gameFinale";

function withEveryMission(score: number): ProgressState {
  return {
    ...initialProgressState,
    completedLevelIds: playableMissionOrder.map((mission) => mission.id as LevelId),
    bestResultsByLevelId: Object.fromEntries(
      playableMissionOrder.map((mission) => [
        mission.id,
        { score, correctRounds: 1, totalRounds: 1, elapsedMs: null, attemptId: null, completedAt: null }
      ])
    )
  };
}

describe("the closing screen's numbers", () => {
  it("counts three stars an island for every mission played perfectly", () => {
    const finale = getGameFinale(withEveryMission(1000));

    expect(finale.missions).toBe(playableMissionOrder.length);
    expect(finale.possible).toBe(playableMissionOrder.length * 3);
    expect(finale.stars).toBe(finale.possible);
    for (const tally of finale.islands) expect(tally.stars).toBe(tally.possible);
  });

  it("shows a partial journey as partial rather than as complete", () => {
    // 500 clears the first threshold only, so every mission is worth exactly one star.
    const finale = getGameFinale(withEveryMission(500));

    expect(finale.stars).toBe(playableMissionOrder.length);
    expect(finale.stars).toBeLessThan(finale.possible);
  });

  it("gives an untouched profile zero stars without ever dividing by an empty island", () => {
    const finale = getGameFinale(initialProgressState);

    expect(finale.stars).toBe(0);
    expect(finale.possible).toBeGreaterThan(0);
    expect(finale.islands.every((tally) => tally.possible > 0)).toBe(true);
  });

  it("lists every island that has content, and only those", () => {
    /*
     * Read from the catalog rather than written down: an island added later appears in the
     * closing screen on its own, and one with nothing playable never shows a hollow "0 of 0".
     */
    const withContent = islands
      .filter((island) => playableMissionOrder.some((mission) => mission.category && island.key))
      .map((island) => island.key);
    const listed = getGameFinale(initialProgressState).islands.map((tally) => tally.islandKey);

    expect(listed.length).toBeGreaterThan(0);
    expect(withContent).toEqual(expect.arrayContaining(listed));
  });

  it("only calls the game finished when no mission is left", () => {
    expect(hasFinishedEveryMission(initialProgressState)).toBe(false);
    expect(hasFinishedEveryMission(withEveryMission(1000))).toBe(true);

    const allButOne = {
      ...initialProgressState,
      completedLevelIds: playableMissionOrder.slice(0, -1).map((mission) => mission.id as LevelId)
    };
    expect(hasFinishedEveryMission(allButOne)).toBe(false);
  });
});
