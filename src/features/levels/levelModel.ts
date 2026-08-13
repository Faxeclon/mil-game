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
export const levelModes = [
  "compare",
  "compare-timed",
  "single",
  "single-uncertain",
  /**
   * A mission that asks what to do rather than what something is.
   *
   * Every mode above ends at a judgement about a picture. This one starts where that
   * leaves off - who could confirm this, what do I do before passing it on, how do I say
   * that I made this with AI - and it is the only mode that keeps working when the next
   * image generator stops leaving anything to see.
  */
  "decision"
] as const;

export type LevelMode = (typeof levelModes)[number];

/** Icon names shared with the map artwork. */
export type MapIcon = "training" | "source" | "context" | "voices" | "videos" | "share";

/*
 * Four islands, each one finished, rather than five with a thin one among them.
 *
 * There used to be an island called "checking the source" that never asked anybody to
 * check a source: it showed two more pictures and judged them by eye, like the island
 * before it. Naming a skill the content does not teach is worse than not having the
 * island, so it is gone and its two missions with it.
 */
export const islands = [
  { key: "training", order: 1, icon: "training" },
  { key: "difference", order: 2, icon: "context" },
  { key: "videos", order: 3, icon: "videos" },
  /*
   * The last island, and the only one that is not about looking.
   *
   * Everything before it trains judgement: what is this, who made it, can I even tell.
   * This one asks what the child does next - who could confirm a claim, what to do before
   * passing something on, how to say that a picture was made with AI. It comes last
   * because deciding what to do only means something once you know what you are deciding
   * about.
   */
  { key: "decisions", order: 4, icon: "share" }
] as const satisfies readonly { key: string; order: number; icon: MapIcon }[];

export type IslandKey = (typeof islands)[number]["key"];

export const categories = [
  { key: "basics", island: "training", order: 1, icon: "training" },
  { key: "animals", island: "difference", order: 1, icon: "context" },
  { key: "sports", island: "difference", order: 2, icon: "videos" },
  { key: "clips", island: "videos", order: 1, icon: "videos" },
  /*
   * Four themes, in the order the questions get harder to answer alone.
   *
   * Who said it is checkable: there is an official page or there is not. Why they said it
   * asks about somebody else's interest, which is never written on the message. Whether
   * you have enough to decide asks about your own knowledge. And only then, what you do
   * with it - which is the one that touches another person.
   */
  { key: "checking", island: "decisions", order: 1, icon: "source" },
  { key: "influence", island: "decisions", order: 2, icon: "voices" },
  { key: "limits", island: "decisions", order: 3, icon: "context" },
  { key: "sharing", island: "decisions", order: 4, icon: "share" }
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

  // Island 3 - Videos: the same question asked of moving pictures. A clip is judged from
  // how it moves, where a change can be worth checking but never proves an origin by itself.
  //
  // One clip at a time, with no second one beside it. Two videos side by side on a phone
  // are two small squares both moving at once, and a child ends up comparing which looks
  // nicer rather than watching either of them. Alone, there is nothing to compare against
  // but their own judgement, which is the skill this island is for.
  { id: "clips-1", category: "clips", order: 1, mode: "single", packId: "clips-single-v1" },

  /*
   * Island 4 - Deciding: what to do, once you know what you are looking at.
   *
   * These are the only missions with no picture in them, and that is the point. A tell
   * that works today stops working when the next model ships; "find who published it" and
   * "stop before you pass it on" do not. Declared last because that is the order a child
   * meets them in.
   */
  { id: "checking-1", category: "checking", order: 1, mode: "decision", packId: "decision-source-v1" },
  { id: "influence-1", category: "influence", order: 1, mode: "decision", packId: "decision-influence-v1" },
  { id: "limits-1", category: "limits", order: 1, mode: "decision", packId: "decision-limits-v1" },
  { id: "sharing-1", category: "sharing", order: 1, mode: "decision", packId: "decision-share-v1" }
] as const satisfies readonly MissionBlueprint[];

/** Removed content IDs remain parseable only so local legacy progress is never discarded. */
export const legacyRetiredLevelIds = ["memes-1", "memes-2"] as const;
export type LegacyRetiredLevelId = (typeof legacyRetiredLevelIds)[number];

/** Active level IDs plus identifiers retained solely for legacy progress normalization. */
export type LevelId = (typeof levelBlueprintEntries)[number]["id"] | LegacyRetiredLevelId;

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
  /*
   * Not hard to see - there is nothing to see. What it asks is whether the child can hold
   * back for a moment and choose, which is a different kind of demand from squinting at a
   * picture, and one a younger player can meet.
  */
  decision: "medium"
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
  return typeof value === "string" && (missionBlueprint.some((mission) => mission.id === value) || legacyRetiredLevelIds.includes(value as LegacyRetiredLevelId));
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
