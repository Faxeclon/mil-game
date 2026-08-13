import { getStarCount } from "@/features/scoring/levelScore";
import { getIslandOfMission, islands, type IslandKey, type LevelId } from "@/features/levels/levelModel";
import { playableMissionOrder } from "@/features/levels/progressSummary";
import type { ProgressState } from "@/features/progress/progressState";

export type IslandTally = {
  islandKey: IslandKey;
  /** Stars kept from this island's best runs. */
  stars: number;
  /** Stars this island could give, so a partial score reads as a partial score. */
  possible: number;
};

export type GameFinale = {
  islands: IslandTally[];
  stars: number;
  possible: number;
  missions: number;
};

/**
 * What the closing screen shows: the whole journey, island by island.
 *
 * Counted from the stored best runs rather than from the last attempt, because the screen
 * celebrates the map a child finished and not the one mission they happened to end on. A
 * replay that went badly must never take stars away from the picture of their journey.
 *
 * Islands with nothing playable are left out entirely. An island drawn with "0 of 0" would
 * read as a failure rather than as an island that has no content yet.
 */
export function getGameFinale(state: ProgressState): GameFinale {
  const tallies = islands
    .map((island) => {
      const missions = playableMissionOrder.filter((mission) => getIslandOfMission(mission.id) === island.key);
      const stars = missions.reduce((sum, mission) => {
        const best = state.bestResultsByLevelId[mission.id as LevelId];
        return sum + (best ? getStarCount(best.score) : 0);
      }, 0);

      return { islandKey: island.key, stars, possible: missions.length * 3 };
    })
    .filter((tally) => tally.possible > 0);

  return {
    islands: tallies,
    stars: tallies.reduce((sum, tally) => sum + tally.stars, 0),
    possible: tallies.reduce((sum, tally) => sum + tally.possible, 0),
    missions: playableMissionOrder.length
  };
}

/** True once every playable mission has been finished at least once. */
export function hasFinishedEveryMission(state: ProgressState): boolean {
  return playableMissionOrder.every((mission) => state.completedLevelIds.includes(mission.id as LevelId));
}
