import type { ProgressState } from "@/features/progress/progressState";
import { isLevelCompleted } from "@/features/progress/progressState";
import {
  getMissionById,
  islands,
  type CategoryKey,
  type IslandKey,
  type LevelId,
  type MissionBlueprint
} from "./levelModel";
import {
  getMissionState,
  getPlayableCategories,
  getPlayableMissions,
  playableIslandOrder
} from "./levelProgress";

/**
 * How much of something is done, ready to be shown and to be read aloud.
 *
 * Only playable missions are counted. A mission declared for the roadmap but without
 * content is not a pending task, so it must not drag a percentage down or make an island
 * that a child has genuinely finished look unfinished.
 */
export type ProgressSummary = {
  done: number;
  total: number;
  /** A whole percentage, 0 to 100. Nothing playable means 0, never a division by zero. */
  percent: number;
  /** True when there is nothing playable here yet, which is its own state, not zero progress. */
  isEmpty: boolean;
  isComplete: boolean;
};

function summarize(done: number, total: number): ProgressSummary {
  const safeTotal = Math.max(0, Math.trunc(total));
  const safeDone = Math.min(Math.max(0, Math.trunc(done)), safeTotal);
  return {
    done: safeDone,
    total: safeTotal,
    percent: safeTotal === 0 ? 0 : Math.round((safeDone / safeTotal) * 100),
    isEmpty: safeTotal === 0,
    isComplete: safeTotal > 0 && safeDone === safeTotal
  };
}

/**
 * Every playable mission of the game, in the order a player meets them. Progression is
 * strictly sequential across this list, so it is also what tells a locked mission which
 * earlier mission is holding it shut.
 */
export const playableMissionOrder: readonly MissionBlueprint[] = playableIslandOrder.flatMap((island) =>
  getPlayableCategories(island).flatMap((category) => getPlayableMissions(category.key))
);

function countDone(state: ProgressState, missions: readonly MissionBlueprint[]): number {
  return missions.filter((mission) => isLevelCompleted(state, mission.id)).length;
}

export function getCategoryProgress(state: ProgressState, category: CategoryKey): ProgressSummary {
  const missions = getPlayableMissions(category);
  return summarize(countDone(state, missions), missions.length);
}

export function getIslandProgress(state: ProgressState, island: IslandKey): ProgressSummary {
  const missions = getPlayableCategories(island).flatMap((category) => getPlayableMissions(category.key));
  return summarize(countDone(state, missions), missions.length);
}

/**
 * Rush is the island's completed-path reward. The page guard and island card share this
 * rule; a reward already earned remains open if later content extends that island.
 */
export function isIslandRushUnlocked(state: ProgressState, island: string): boolean {
  if (!islands.some((entry) => entry.key === island)) return false;
  return state.rushUnlockedIslands.includes(island as IslandKey) || getIslandProgress(state, island as IslandKey).isComplete;
}

export function getGlobalProgress(state: ProgressState): ProgressSummary {
  return summarize(countDone(state, playableMissionOrder), playableMissionOrder.length);
}

/**
 * Why a mission is in the state it is in, so the interface can explain the next step
 * without any screen re-deriving the unlock rules for itself.
 */
export type MissionRequirement =
  | { kind: "available" }
  | { kind: "completed" }
  /** Declared for the roadmap but with no content: not part of the playable path at all. */
  | { kind: "comingSoon" }
  /** Locked until this earlier mission is finished. */
  | { kind: "requiresMission"; missionId: LevelId }
  /** Locked, and nothing earlier explains it; the map itself has not opened this far. */
  | { kind: "locked" };

export function getMissionRequirement(state: ProgressState, mission: MissionBlueprint): MissionRequirement {
  if (!mission.packId) return { kind: "comingSoon" };

  const playState = getMissionState(state, mission);
  if (playState === "completed") return { kind: "completed" };
  if (playState === "available") return { kind: "available" };

  const position = playableMissionOrder.findIndex((entry) => entry.id === mission.id);
  for (let index = position - 1; index >= 0; index -= 1) {
    const earlier = playableMissionOrder[index];
    if (!isLevelCompleted(state, earlier.id)) return { kind: "requiresMission", missionId: earlier.id as LevelId };
  }
  return { kind: "locked" };
}

export function getMissionRequirementById(state: ProgressState, missionId: string): MissionRequirement {
  const mission = getMissionById(missionId);
  return mission ? getMissionRequirement(state, mission) : { kind: "locked" };
}
