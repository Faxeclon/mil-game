import { isLevelCompleted, type ProgressState } from "@/features/progress/progressState";
import {
  getCategoriesByIsland,
  getIslandOfCategory,
  getMissionById,
  getMissionsByCategory,
  islandOrder,
  missionBlueprint,
  type CategoryKey,
  type IslandKey,
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
