import type { IslandKey } from "@/features/levels/levelModel";
import type { BonusWheelReward } from "@/features/bonus/bonusOpportunity";

export const achievementDefinitions = [
  { id: "bonus-perfect-training", islandKey: "training", messageKey: "starCadet", icon: "star", collectionHint: "perfect-island" },
  { id: "bonus-perfect-difference", islandKey: "difference", messageKey: "detailHunter", icon: "search", collectionHint: "perfect-island" },
  { id: "bonus-perfect-source", islandKey: "source", messageKey: "sourceSleuth", icon: "detective", collectionHint: "perfect-island" },
  { id: "bonus-perfect-videos", islandKey: "videos", messageKey: "directorsEye", icon: "film", collectionHint: "perfect-island" },
  { id: "bonus-eggspert", messageKey: "eggspert", icon: "egg", collectionHint: "perfect-double-points" }
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
      "islandKey" in achievement && achievement.islandKey === input.islandKey
  );
  if (!islandAchievement) return [];
  return input.reward === "double-points"
    ? [islandAchievement.id, "bonus-eggspert"]
    : [islandAchievement.id];
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
