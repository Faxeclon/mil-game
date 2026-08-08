import type { LevelId } from "@/features/levels/levelModel";
import type { ApprenticeAvatarId } from "@/features/profile/apprenticeAvatar";
import {
  emptyProfilesDocument,
  getActiveProgress,
  updateActiveProgress,
  type ProfilesDocument
} from "@/features/profiles/localProfiles";
import {
  authorizeGuardian,
  completeLevel,
  initialProgressState,
  markOnboarded,
  advanceMapOnboarding,
  withdrawGuardian,
  type LevelAttempt,
  type ProgressState
} from "./progressState";
import { requestPersistentStorage } from "@/features/offline/registerServiceWorker";
import { readProfilesDocument, writeProfilesDocument } from "./progressStorage";

export type ProgressSnapshot = {
  /** False until the stored progress has been read in the browser. */
  hydrated: boolean;
  state: ProgressState;
  /** Everyone who plays on this phone, and who is holding it now. */
  profiles: ProfilesDocument;
};

/**
 * Stored progress is an external system, so it lives in a small store that React reads
 * through useSyncExternalStore. The server always renders the empty snapshot, which the
 * first client subscription replaces with whatever was saved.
 *
 * Every write goes through the active profile, so the rest of the app can keep thinking
 * in terms of one player's progress and never has to know the phone is shared.
 */
const serverSnapshot: ProgressSnapshot = {
  hydrated: false,
  state: initialProgressState,
  profiles: emptyProfilesDocument
};

let snapshot: ProgressSnapshot = serverSnapshot;
const listeners = new Set<() => void>();

function publish(next: ProgressSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function fromDocument(profiles: ProfilesDocument): ProgressSnapshot {
  return { hydrated: true, state: getActiveProgress(profiles), profiles };
}

function commit(profiles: ProfilesDocument): void {
  if (profiles === snapshot.profiles) return;
  writeProfilesDocument(profiles);
  publish(fromDocument(profiles));
}

export function subscribeToProgress(listener: () => void): () => void {
  listeners.add(listener);
  // The first subscriber pulls the saved progress in; later ones reuse it.
  if (!snapshot.hydrated) publish(fromDocument(readProfilesDocument()));
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

function applyToActiveProgress(change: (state: ProgressState) => ProgressState): void {
  const next = change(snapshot.state);
  if (next === snapshot.state) return;
  commit(updateActiveProgress(snapshot.profiles, next));
}

export function completeLevelInStore(levelId: LevelId, result: LevelAttempt): void {
  applyToActiveProgress((state) => completeLevel(state, levelId, result));

  /*
   * Asked for here rather than on the first page load, because a browser weighs the
   * request by whether the player has anything worth keeping. Finishing a mission is
   * exactly that moment. Best effort: a refusal must never interrupt the game.
   */
  void requestPersistentStorage();
}

export function markOnboardedInStore(localNickname?: string, apprenticeAvatarId?: ApprenticeAvatarId): void {
  applyToActiveProgress((state) => markOnboarded(state, localNickname, apprenticeAvatarId));
}

export function advanceMapOnboardingInStore(): void {
  applyToActiveProgress(advanceMapOnboarding);
}

/** Clears only the player holding the phone; the others keep everything they earned. */
export function resetProgressInStore(): void {
  applyToActiveProgress(() => initialProgressState);
  if (snapshot.profiles.profiles.length === 0) publish(fromDocument(emptyProfilesDocument));
}

export function authorizeGuardianInStore(email: string, authorizedOn: string): void {
  applyToActiveProgress((state) => authorizeGuardian(state, email, authorizedOn));
}

export function withdrawGuardianInStore(): void {
  applyToActiveProgress(withdrawGuardian);
}

/** Test helper: drops every subscriber and returns the store to its initial snapshot. */
export function resetProgressStoreForTests(): void {
  listeners.clear();
  snapshot = serverSnapshot;
}
