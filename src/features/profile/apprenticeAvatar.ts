/**
 * Player avatars are young apprentices. Roqui is the permanent guide and is
 * deliberately not part of this selectable catalog.
 */
export const apprenticeAvatarIds = ["eagle", "fox", "rabbit", "turtle", "owl", "cat"] as const;

export type ApprenticeAvatarId = (typeof apprenticeAvatarIds)[number];

export const defaultApprenticeAvatarId: ApprenticeAvatarId = "eagle";

export function isApprenticeAvatarId(value: unknown): value is ApprenticeAvatarId {
  return typeof value === "string" && apprenticeAvatarIds.includes(value as ApprenticeAvatarId);
}
