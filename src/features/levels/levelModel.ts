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
  { key: "source", order: 3, icon: "source" },
  { key: "videos", order: 4, icon: "videos" }
] as const satisfies readonly { key: string; order: number; icon: MapIcon }[];

export type IslandKey = (typeof islands)[number]["key"];

export const categories = [
  { key: "basics", island: "training", order: 1, icon: "training" },
  { key: "animals", island: "difference", order: 1, icon: "context" },
  { key: "sports", island: "difference", order: 2, icon: "videos" },
  { key: "creators", island: "source", order: 1, icon: "voices" },
  { key: "memes", island: "difference", order: 3, icon: "share" },
  { key: "clips", island: "videos", order: 1, icon: "videos" }
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
    packId: "city-basics-timed-v1"
  },

  // Island 2 - Telling images apart: the same ladder, once per theme.
  // The single-image missions are declared without a pack: they show as coming soon
  // until their content exists, which keeps the roadmap visible without faking it.
  { id: "animals-1", category: "animals", order: 1, mode: "compare", packId: "animals-compare-v1" },
  {
    id: "animals-2",
    category: "animals",
    order: 2,
    mode: "compare-timed",
    secondsPerRound: 12,
    packId: "animals-timed-v1"
  },
  { id: "animals-3", category: "animals", order: 3, mode: "single", packId: "animals-single-v1" },
  { id: "sports-1", category: "sports", order: 1, mode: "compare", packId: "sports-compare-v1" },
  { id: "sports-2", category: "sports", order: 2, mode: "single", packId: "sports-single-v1" },

  // Memes belong with the images they are made of: a meme is a photo somebody wrote on,
  // and the thing being judged is still the photo underneath.
  { id: "memes-1", category: "memes", order: 1, mode: "meme", packId: "memes-uncertain-v1" },
  { id: "memes-2", category: "memes", order: 2, mode: "meme", packId: "memes-single-v1" },

  // Island 3 - Checking the source: the image stops being enough, and admitting that is
  // the answer. This is where "I cannot tell by looking" becomes a correct thing to say.
  {
    id: "creators-1",
    category: "creators",
    order: 1,
    mode: "single-uncertain",
    packId: "creators-uncertain-v1"
  },
  { id: "creators-2", category: "creators", order: 2, mode: "single", packId: "creators-single-v1" },

  // Island 4 - Videos: the same question asked of moving pictures. A clip is judged from
  // how it moves, where a change can be worth checking but never proves an origin by itself.
  //
  // One clip at a time, with no second one beside it. Two videos side by side on a phone
  // are two small squares both moving at once, and a child ends up comparing which looks
  // nicer rather than watching either of them. Alone, there is nothing to compare against
  // but their own judgement, which is the skill this island is for.
  { id: "clips-1", category: "clips", order: 1, mode: "single", packId: "clips-single-v1" }
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
