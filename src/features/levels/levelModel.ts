/**
 * The map is three layers deep and every layer is data, not code:
 *
 *   Island    a skill of the MIL model, drawn on the main map
 *   Category  a theme inside an island, drawn as a group of linked sub-islands
 *   Mission   the playable unit, drawn as one sub-island
 *
 * Adding an island, a category or a mission means adding an entry here plus its content
 * pack. No new screen, no new route and no new component.
 */

/** How a mission is played. */
export const levelModes = ["compare", "compare-timed", "single", "single-uncertain", "meme"] as const;

export type LevelMode = (typeof levelModes)[number];

/** Icon names shared with the map artwork. */
export type MapIcon = "training" | "source" | "context" | "voices" | "videos" | "share";

export const islands = [
  { key: "training", order: 1, icon: "training" },
  { key: "difference", order: 2, icon: "context" },
  { key: "source", order: 3, icon: "source" }
] as const satisfies readonly { key: string; order: number; icon: MapIcon }[];

export type IslandKey = (typeof islands)[number]["key"];

export const categories = [
  { key: "basics", island: "training", order: 1, icon: "training" },
  { key: "animals", island: "difference", order: 1, icon: "context" },
  { key: "sports", island: "difference", order: 2, icon: "videos" },
  { key: "creators", island: "source", order: 1, icon: "voices" }
] as const satisfies readonly { key: string; island: IslandKey; order: number; icon: MapIcon }[];

export type CategoryKey = (typeof categories)[number]["key"];

export type MissionBlueprint = {
  id: string;
  category: CategoryKey;
  /** Position inside its category, starting at 1. */
  order: number;
  mode: LevelMode;
  /** Seconds allowed per round; only timed modes set it. */
  secondsPerRound?: number;
  /** Content pack identifier. A mission without one is not playable yet. */
  packId?: string;
};

const levelBlueprintEntries = [
  // Island 1 - Training: learn the mechanic with no theme in the way.
  { id: "basics-1", category: "basics", order: 1, mode: "compare", packId: "introductory-tutorial-v1" },
  {
    id: "basics-2",
    category: "basics",
    order: 2,
    mode: "compare-timed",
    secondsPerRound: 15,
    packId: "introductory-tutorial-v1"
  },

  // Island 2 - Telling images apart: the same ladder, once per theme.
  // The single-image missions are declared without a pack: they show as coming soon
  // until their content exists, which keeps the roadmap visible without faking it.
  { id: "animals-1", category: "animals", order: 1, mode: "compare", packId: "introductory-tutorial-v1" },
  {
    id: "animals-2",
    category: "animals",
    order: 2,
    mode: "compare-timed",
    secondsPerRound: 12,
    packId: "introductory-tutorial-v1"
  },
  { id: "animals-3", category: "animals", order: 3, mode: "single" },
  { id: "sports-1", category: "sports", order: 1, mode: "compare", packId: "introductory-tutorial-v1" },
  { id: "sports-2", category: "sports", order: 2, mode: "single" }
] as const satisfies readonly MissionBlueprint[];

/** A level identifier authored in the current level catalog. */
export type LevelId = (typeof levelBlueprintEntries)[number]["id"];

export const missionBlueprint: readonly MissionBlueprint[] = levelBlueprintEntries;

export type LevelDifficulty = "easy" | "medium" | "hard";

/**
 * Difficulty comes from the mode, never from a separate field, so it can not disagree
 * with what the mission actually asks. Comparing two images hands the player a clue for
 * free; judging a single one forces their own criteria; admitting an image cannot be
 * classified by looking is the hardest and most valuable step.
 */
const difficultyByMode: Record<LevelMode, LevelDifficulty> = {
  compare: "easy",
  "compare-timed": "medium",
  single: "medium",
  "single-uncertain": "hard",
  meme: "hard"
};

export function getLevelDifficulty(mode: LevelMode): LevelDifficulty {
  return difficultyByMode[mode];
}

export function isTimedMode(mode: LevelMode): boolean {
  return mode === "compare-timed";
}

/** True when the mode shows two images side by side rather than a single one. */
export function isComparisonMode(mode: LevelMode): boolean {
  return mode === "compare" || mode === "compare-timed";
}

/** True when the mode shows one image and asks who made it. */
export function isSingleMode(mode: LevelMode): boolean {
  return mode === "single" || mode === "single-uncertain";
}

export function getMissionById(missionId: string): MissionBlueprint | undefined {
  return missionBlueprint.find((mission) => mission.id === missionId);
}

/** Narrows untrusted route or stored input to an authored level identifier. */
export function isLevelId(value: unknown): value is LevelId {
  return typeof value === "string" && missionBlueprint.some((mission) => mission.id === value);
}

export function getMissionsByCategory(category: CategoryKey): MissionBlueprint[] {
  return missionBlueprint
    .filter((mission) => mission.category === category)
    .sort((a, b) => a.order - b.order);
}

export function getCategoriesByIsland(island: IslandKey) {
  return categories.filter((category) => category.island === island).sort((a, b) => a.order - b.order);
}

export function getCategory(category: CategoryKey) {
  return categories.find((entry) => entry.key === category);
}

export function getIslandOfCategory(category: CategoryKey): IslandKey | undefined {
  return getCategory(category)?.island;
}

export function getIslandOfMission(missionId: string): IslandKey | undefined {
  const mission = getMissionById(missionId);
  return mission ? getIslandOfCategory(mission.category) : undefined;
}

export const islandOrder: readonly IslandKey[] = [...islands]
  .sort((a, b) => a.order - b.order)
  .map((island) => island.key);
