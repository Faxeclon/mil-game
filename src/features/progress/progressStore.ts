import type { LevelId } from "@/features/levels/levelModel";
import {
  completeLevel,
  initialProgressState,
  markOnboarded,
  type LevelAttempt,
  type ProgressState
} from "./progressState";
import { clearProgressState, readProgressState, writeProgressState } from "./progressStorage";

export type ProgressSnapshot = {
  /** False until the stored progress has been read in the browser. */
  hydrated: boolean;
  state: ProgressState;
};

/**
 * Stored progress is an external system, so it lives in a small store that React reads
 * through useSyncExternalStore. The server always renders the empty snapshot, which the
 * first client subscription replaces with whatever was saved.
 */
const serverSnapshot: ProgressSnapshot = { hydrated: false, state: initialProgressState };

let snapshot: ProgressSnapshot = serverSnapshot;
const listeners = new Set<() => void>();

function publish(next: ProgressSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribeToProgress(listener: () => void): () => void {
  listeners.add(listener);
  // The first subscriber pulls the saved progress in; later ones reuse it.
  if (!snapshot.hydrated) publish({ hydrated: true, state: readProgressState() });
  return () => {
    listeners.delete(listener);
  };
}

export function getProgressSnapshot(): ProgressSnapshot {
  return snapshot;
}

export function getServerProgressSnapshot(): ProgressSnapshot {
  return serverSnapshot;
}

export function completeLevelInStore(levelId: LevelId, result?: LevelAttempt): void {
  const next = completeLevel(snapshot.state, levelId, result);
  if (next === snapshot.state) return;
  writeProgressState(next);
  publish({ hydrated: true, state: next });
}

export function markOnboardedInStore(playerName?: string): void {
  const next = markOnboarded(snapshot.state, playerName);
  if (next === snapshot.state) return;
  writeProgressState(next);
  publish({ hydrated: true, state: next });
}

export function resetProgressInStore(): void {
  clearProgressState();
  publish({ hydrated: true, state: initialProgressState });
}

/** Test helper: drops every subscriber and returns the store to its initial snapshot. */
export function resetProgressStoreForTests(): void {
  listeners.clear();
  snapshot = serverSnapshot;
}
