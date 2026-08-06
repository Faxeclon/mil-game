import {
  needsLocalNicknameCompletion,
  type ProgressState
} from "@/features/progress/progressState";

export type ProfileRouteAccess = "checking" | "denied" | "allowed";

export function getProfileRouteAccess(
  hydrated: boolean,
  onboarded: boolean,
  progressState: ProgressState
): ProfileRouteAccess {
  if (!hydrated) return "checking";
  return !onboarded || needsLocalNicknameCompletion(progressState) ? "denied" : "allowed";
}
