import { isLevelCompleted, type ProgressState } from "@/features/progress/progressState";
import { getMissionById, type CategoryKey, type IslandKey, type MissionBlueprint } from "./levelModel";
import { getIslandOfCategory } from "./levelModel";
import { getPlayableCategories, getPlayableMissions } from "./levelProgress";

/**
 * Whether Roqui should present something before this mission starts.
 *
 * A child crossing into a new island has just arrived somewhere: saying so is the
 * difference between a map and a list. The same is true one level down, when the theme
 * changes from animals to sport.
 *
 * It is derived rather than stored. Nothing records "this island was introduced": the
 * moment is defined as standing at the first mission of a place you have not finished
 * yet, so it happens exactly once on the way through and never gets out of step with
 * the map.
 */
export type MissionIntro =
  | { kind: "island"; islandKey: IslandKey; categoryKey: CategoryKey }
  | { kind: "category"; categoryKey: CategoryKey }
  | null;

function isFirstPlayableOfCategory(mission: MissionBlueprint): boolean {
  return getPlayableMissions(mission.category)[0]?.id === mission.id;
}

function isFirstPlayableCategoryOfIsland(island: IslandKey, category: CategoryKey): boolean {
  return getPlayableCategories(island)[0]?.key === category;
}

export function getMissionIntro(state: ProgressState, missionId: string): MissionIntro {
  const mission = getMissionById(missionId);
  if (!mission || !mission.packId) return null;

  // Already finished means already arrived: a replay is not a first visit.
  if (isLevelCompleted(state, mission.id)) return null;
  if (!isFirstPlayableOfCategory(mission)) return null;

  const islandKey = getIslandOfCategory(mission.category);
  if (!islandKey) return null;

  return isFirstPlayableCategoryOfIsland(islandKey, mission.category)
    ? { kind: "island", islandKey, categoryKey: mission.category }
    : { kind: "category", categoryKey: mission.category };
}
