import { getContinueDestination } from "@/features/levels/levelProgress";
import type { LevelId } from "@/features/levels/levelModel";
import type { ProgressState } from "@/features/progress/progressState";

export function getResultsAttemptPath(attemptId: string): string {
  return `/results?attempt=${encodeURIComponent(attemptId)}`;
}

export function getReplayPath(levelId: LevelId): string {
  return `/level/${levelId}`;
}

export function getContinuePath(state: ProgressState, completedLevelId: LevelId): string {
  const destination = getContinueDestination(state, completedLevelId);
  if (destination.kind === "level") return getReplayPath(destination.levelId);
  if (destination.kind === "island") return `/island/${destination.islandKey}`;
  return "/worlds";
}
