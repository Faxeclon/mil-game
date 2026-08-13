import type { IslandKey } from "@/features/levels/levelModel";
import type { BonusWheelReward } from "@/features/bonus/bonusOpportunity";

export const achievementDefinitions = [
  { id: "bonus-perfect-training", islandKey: "training", messageKey: "starCadet", icon: "star", collectionHint: "perfect-island", earnedBy: "bonus-perfect" },
  { id: "bonus-perfect-difference", islandKey: "difference", messageKey: "detailHunter", icon: "search", collectionHint: "perfect-island", earnedBy: "bonus-perfect" },
  { id: "bonus-perfect-videos", islandKey: "videos", messageKey: "directorsEye", icon: "film", collectionHint: "island-completion", earnedBy: "island-completion" },
  /*
   * One achievement per island, so the collection has a hole in it exactly when the map
   * does. The island this replaced is gone; an id that no island can award would sit in
   * the collection screen as a badge nobody could ever earn.
   */
  { id: "bonus-perfect-decisions", islandKey: "decisions", messageKey: "steadyHand", icon: "detective", collectionHint: "island-completion", earnedBy: "island-completion" },
  { id: "bonus-eggspert", messageKey: "eggspert", icon: "egg", collectionHint: "perfect-double-points", earnedBy: "bonus-perfect" }
] as const;

export type AchievementDefinition = (typeof achievementDefinitions)[number];
export type AchievementId = AchievementDefinition["id"];
export type AchievementIcon = AchievementDefinition["icon"];

export function isAchievementId(value: unknown): value is AchievementId {
  return typeof value === "string" && achievementDefinitions.some((achievement) => achievement.id === value);
}

export function getAchievementDefinition(id: AchievementId): AchievementDefinition {
  return achievementDefinitions.find((achievement) => achievement.id === id)!;
}

/** A perfect Bonus is based on real mistakes: a shielded error still prevents it. */
export function getBonusRunAchievementIds(input: {
  islandKey: IslandKey;
  actualMistakeCount: number;
  reward: BonusWheelReward;
}): AchievementId[] {
  if (input.actualMistakeCount !== 0) return [];
  const islandAchievement = achievementDefinitions.find(
    (achievement): achievement is Extract<AchievementDefinition, { islandKey: IslandKey }> =>
      "islandKey" in achievement && achievement.islandKey === input.islandKey && achievement.earnedBy === "bonus-perfect"
  );
  if (!islandAchievement) return [];
  return input.reward === "double-points"
    ? [islandAchievement.id, "bonus-eggspert"]
    : [islandAchievement.id];
}

/** Islands without a Bonus still celebrate their authored learning path once it is complete. */
export function getIslandCompletionAchievementIds(islandKey: IslandKey): AchievementId[] {
  return achievementDefinitions
    .filter((achievement): achievement is Extract<AchievementDefinition, { islandKey: IslandKey }> =>
      "islandKey" in achievement && achievement.islandKey === islandKey && achievement.earnedBy === "island-completion"
    )
    .map((achievement) => achievement.id);
}

/** Adds stable IDs once, preserving the order in which this profile earned them. */
export function addAchievements(existing: readonly AchievementId[], candidates: readonly AchievementId[]): AchievementId[] {
  const known = new Set(existing);
  const next = [...existing];
  for (const id of candidates) {
    if (known.has(id)) continue;
    known.add(id);
    next.push(id);
  }
  return next;
}

export function getNewAchievementIds(existing: readonly AchievementId[], candidates: readonly AchievementId[]): AchievementId[] {
  const known = new Set(existing);
  const next: AchievementId[] = [];
  for (const id of candidates) {
    if (known.has(id)) continue;
    known.add(id);
    next.push(id);
  }
  return next;
}
