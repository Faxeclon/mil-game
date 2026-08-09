import { isLevelCompleted, type ProgressState } from "@/features/progress/progressState";
import {
  getCategoriesByIsland,
  getIslandOfCategory,
  getIslandOfMission,
  getMissionById,
  getMissionsByCategory,
  islandOrder,
  missionBlueprint,
  type CategoryKey,
  type IslandKey,
  type LevelId,
  type MissionBlueprint
} from "./levelModel";

export type PlayState = "available" | "locked" | "completed";

/**
 * The whole map is derived from one list: the missions the player has finished. Nothing
 * about availability or locking is stored, so the map can never contradict itself.
 *
 * The rules are the same at every layer, which is why one function shape serves all
 * three: something is completed when everything inside it is, and available when it is
 * the first unfinished one of its parent.
 */

/** Missions with authored content. A mission without a pack is not playable yet. */
export function getPlayableMissions(category: CategoryKey): MissionBlueprint[] {
  return getMissionsByCategory(category).filter((mission) => Boolean(mission.packId));
}

export function hasContent(category: CategoryKey): boolean {
  return getPlayableMissions(category).length > 0;
}

export function getPlayableCategories(island: IslandKey) {
  return getCategoriesByIsland(island).filter((category) => hasContent(category.key));
}

export function islandHasContent(island: IslandKey): boolean {
  return getPlayableCategories(island).length > 0;
}

/** Islands with content, in map order. Empty islands are closed, never done. */
export const playableIslandOrder: readonly IslandKey[] = islandOrder.filter(islandHasContent);

// ------------------------------------------------------------------ Completion

export function isCategoryCompleted(state: ProgressState, category: CategoryKey): boolean {
  const missions = getPlayableMissions(category);
  return missions.length > 0 && missions.every((mission) => isLevelCompleted(state, mission.id));
}

export function isIslandCompleted(state: ProgressState, island: IslandKey): boolean {
  const categories = getPlayableCategories(island);
  return categories.length > 0 && categories.every((category) => isCategoryCompleted(state, category.key));
}

// ----------------------------------------------------------------- Availability

export function getAvailableIsland(state: ProgressState): IslandKey | null {
  return playableIslandOrder.find((island) => !isIslandCompleted(state, island)) ?? null;
}

export function getIslandState(state: ProgressState, island: IslandKey): PlayState {
  if (!islandHasContent(island)) return "locked";
  if (isIslandCompleted(state, island)) return "completed";
  return getAvailableIsland(state) === island ? "available" : "locked";
}

/** The open category of an island: the first one still unfinished. */
export function getAvailableCategory(state: ProgressState, island: IslandKey): CategoryKey | null {
  return getPlayableCategories(island).find((category) => !isCategoryCompleted(state, category.key))?.key ?? null;
}

export function getCategoryState(state: ProgressState, category: CategoryKey): PlayState {
  const island = getIslandOfCategory(category);
  if (!island || !hasContent(category)) return "locked";
  if (isCategoryCompleted(state, category)) return "completed";
  if (getIslandState(state, island) === "locked") return "locked";
  return getAvailableCategory(state, island) === category ? "available" : "locked";
}

export function getAvailableMission(state: ProgressState, category: CategoryKey): MissionBlueprint | null {
  return getPlayableMissions(category).find((mission) => !isLevelCompleted(state, mission.id)) ?? null;
}

export function getMissionState(state: ProgressState, mission: MissionBlueprint): PlayState {
  if (isLevelCompleted(state, mission.id)) return "completed";
  if (getCategoryState(state, mission.category) === "locked") return "locked";
  return getAvailableMission(state, mission.category)?.id === mission.id ? "available" : "locked";
}

export function isMissionUnlocked(state: ProgressState, missionId: string): boolean {
  const mission = getMissionById(missionId);
  if (!mission) return false;
  return getMissionState(state, mission) !== "locked";
}

/** The mission a player should continue with: the open one, all the way down. */
export function getNextMission(state: ProgressState): MissionBlueprint | null {
  const island = getAvailableIsland(state);
  if (!island) return null;
  const category = getAvailableCategory(state, island);
  return category ? getAvailableMission(state, category) : null;
}

export type ContinueDestination =
  | { kind: "level"; levelId: LevelId }
  | { kind: "island"; islandKey: IslandKey }
  | { kind: "worlds" };

/**
 * An ephemeral result of this run, derived after a mission is saved. It is deliberately
 * separate from persistent completion: replaying a category's final mission can close
 * the category again without adding another completed id.
 */
export type SectionCompletionEvent = {
  categoryKey: CategoryKey;
  islandKey: IslandKey;
  islandCompleted: boolean;
  destination: ContinueDestination;
};

export function getSectionCompletionEvent(
  state: ProgressState,
  completedLevelId: string
): SectionCompletionEvent | null {
  const mission = getMissionById(completedLevelId);
  if (!mission) return null;

  const missions = getPlayableMissions(mission.category);
  const closesCategory =
    missions.at(-1)?.id === completedLevelId &&
    isCategoryCompleted(state, mission.category) &&
    state.sectionCompletionEvent?.categoryKey === mission.category &&
    state.sectionCompletionEvent.attemptId === state.lastResult?.attemptId;
  const islandKey = getIslandOfCategory(mission.category);
  if (!closesCategory || !islandKey) return null;

  const islandCompleted = isIslandCompleted(state, islandKey);
  return {
    categoryKey: mission.category,
    islandKey,
    islandCompleted,
    destination: islandCompleted ? { kind: "worlds" } : { kind: "island", islandKey }
  };
}

/**
 * Gives the results screen one safe continuation route without duplicating the map's
 * canonical unlock rules. Replays skip already-finished levels and continue to the
 * first later playable level that the authored progression has unlocked.
 */
export function getContinueDestination(state: ProgressState, completedLevelId: string): ContinueDestination {
  const completedIndex = missionBlueprint.findIndex((mission) => mission.id === completedLevelId);
  if (completedIndex === -1) return { kind: "worlds" };

  const islandKey = getIslandOfMission(completedLevelId);
  const sectionEvent = getSectionCompletionEvent(state, completedLevelId);
  if (sectionEvent) return sectionEvent.destination;

  /*
   * Finishing an island is a moment, not a corridor.
   *
   * Carrying straight on would sweep the child into the next island the instant they
   * earned the last one, so the hundred per cent, the finished path and whatever Rush
   * just opened would all happen behind them, unseen. Sending them back to the island
   * they just closed is what turns the unlock into a reward rather than an accident.
   *
   * Which island counts as finished comes from the level model, so this is true of every
   * island there is and of any island added later.
   */
  if (islandKey && isIslandCompleted(state, islandKey)) return { kind: "island", islandKey };

  const laterMission = missionBlueprint
    .slice(completedIndex + 1)
    .find((mission) => Boolean(mission.packId) && !isLevelCompleted(state, mission.id) && isMissionUnlocked(state, mission.id));

  if (laterMission) return { kind: "level", levelId: laterMission.id as LevelId };

  return islandKey ? { kind: "island", islandKey } : { kind: "worlds" };
}

// --------------------------------------------------------------------- Counters

export function countCompletedMissions(state: ProgressState): number {
  return missionBlueprint.filter(
    (mission) => Boolean(mission.packId) && isLevelCompleted(state, mission.id)
  ).length;
}

export function countPlayableMissions(): number {
  return missionBlueprint.filter((mission) => Boolean(mission.packId)).length;
}

/** How far along a category is, for the little counter on its group header. */
export function countCategoryProgress(state: ProgressState, category: CategoryKey) {
  const missions = getPlayableMissions(category);
  return {
    done: missions.filter((mission) => isLevelCompleted(state, mission.id)).length,
    total: missions.length
  };
}
