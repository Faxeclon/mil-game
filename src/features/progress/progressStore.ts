import type { LevelId } from "@/features/levels/levelModel";
import type { ApprenticeAvatarId } from "@/features/profile/apprenticeAvatar";
import {
  createProfileId,
  emptyProfilesDocument,
  getActiveProgress,
  leaveActiveProfile,
  removeProfile,
  selectProfile,
  updateActiveProgress,
  type ProfilesDocument
} from "@/features/profiles/localProfiles";
import {
  authorizeGuardian,
  completeLevel,
  initialProgressState,
  markOnboarded,
  advanceMapOnboarding,
  playAsAdult,
  resetProgressKeepingProfile,
  withdrawGuardian,
  type LevelAttempt,
  type ProgressState
} from "./progressState";
import {
  activateBonusOpportunity,
  consumeBonusOpportunity,
  createBonusOpportunity,
  spinBonusWheel,
  startBonusRushRun,
  updateBonusRushRun,
  type BonusRushRun,
  type BonusOpportunityInput,
  type BonusWheelState
} from "@/features/bonus/bonusOpportunity";
import { requestPersistentStorage } from "@/features/offline/registerServiceWorker";
import { addAchievements, getNewAchievementIds, type AchievementId } from "@/features/achievements/achievementModel";
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

/** Each write goes through the selected player's progress, keeping Bonus tickets isolated. */
export function createBonusOpportunityInStore(input: BonusOpportunityInput): void {
  applyToActiveProgress((state) => createBonusOpportunity(state, input));
}

export function activateBonusOpportunityInStore(id: string): void {
  applyToActiveProgress((state) => activateBonusOpportunity(state, id));
}

export function consumeBonusOpportunityInStore(id: string): void {
  applyToActiveProgress((state) => consumeBonusOpportunity(state, id));
}

/** Writes a wheel result before it is animated, preventing a refresh from rerolling it. */
export function spinBonusWheelInStore(id: string, random?: () => number): BonusWheelState | undefined {
  const before = snapshot.state.bonusOpportunities.find((bonus) => bonus.id === id)?.wheel;
  applyToActiveProgress((state) => spinBonusWheel(state, id, random));
  const after = snapshot.state.bonusOpportunities.find((bonus) => bonus.id === id)?.wheel;
  return after ?? before;
}

export function startBonusRushRunInStore(id: string, run: BonusRushRun): void {
  applyToActiveProgress((state) => startBonusRushRun(state, id, run));
}

export function updateBonusRushRunInStore(id: string, run: BonusRushRun): void {
  applyToActiveProgress((state) => updateBonusRushRun(state, id, run));
}

/** Writes only genuinely new IDs, so a refresh or replay cannot replay a celebration. */
export function unlockAchievementsInStore(candidates: readonly AchievementId[]): AchievementId[] {
  let unlocked: AchievementId[] = [];
  applyToActiveProgress((state) => {
    unlocked = getNewAchievementIds(state.achievementIds, candidates);
    return unlocked.length === 0 ? state : { ...state, achievementIds: addAchievements(state.achievementIds, unlocked) };
  });
  return unlocked;
}

export function markOnboardedInStore(localNickname?: string, apprenticeAvatarId?: ApprenticeAvatarId): void {
  applyToActiveProgress((state) => markOnboarded(state, localNickname, apprenticeAvatarId));
}

/**
 * Puts a grown-up into the game as themselves.
 *
 * Their own game is a profile like any other, so it is found by the address they signed in
 * with rather than made again: a teacher who plays, leaves to run a lesson and comes back
 * returns to their own medals instead of a blank start.
 *
 * Whoever was playing is stepped away from, never overwritten. A child's profile stays in
 * the list exactly as they left it.
 */
export function startAdultPlayInStore(email: string, nickname: string): boolean {
  const state = playAsAdult(initialProgressState, email, nickname);
  // An address or a name the model refuses is not turned into a nameless profile.
  if (state === initialProgressState || state.adultEmail === null) return false;

  const mine = snapshot.profiles.profiles.find((profile) => profile.progress.adultEmail === state.adultEmail);
  if (mine) {
    commit(selectProfile(snapshot.profiles, mine.id));
    return true;
  }

  commit(updateActiveProgress(leaveActiveProfile(snapshot.profiles), state));
  return true;
}

export function advanceMapOnboardingInStore(): void {
  applyToActiveProgress(advanceMapOnboarding);
}

/**
 * Starts the game over for the player holding the phone, without unmaking them.
 *
 * Their missions, records, streak and Rush rewards go, and the map tour plays again. Their
 * name, avatar and the adult who authorised them stay - so this is a new game, not a new
 * child, and nobody is asked what they are called for a second time.
 */
export function resetProgressInStore(): void {
  applyToActiveProgress(resetProgressKeepingProfile);
  if (snapshot.profiles.profiles.length === 0) publish(fromDocument(emptyProfilesDocument));
}

/**
 * Steps away from the profile without erasing it.
 *
 * The child keeps their medals under their nickname, which is the only name this game
 * ever asks a child for, and the next person to pick up the phone is offered the list
 * rather than dropped into somebody else's game.
 *
 * Sound, language and the accessibility choices stay: they belong to the device and to
 * whoever is holding it, not to the player who just handed it over.
 */
export function leaveLocalProfileInStore(): void {
  // `commit`, not `publish`: leaving has to survive closing the app.
  commit(leaveActiveProfile(snapshot.profiles));
}

/** Picks a saved player back up, medals and all. */
export function selectProfileInStore(id: string): void {
  commit(selectProfile(snapshot.profiles, id));
}

/** Adds ready-made players to this device, each with an id of their own. */
export function addProfilesInStore(states: readonly ProgressState[]): void {
  let document = snapshot.profiles;
  for (const progress of states) {
    const id = createProfileId(document.profiles.map((profile) => profile.id));
    document = { ...document, profiles: [...document.profiles, { id, progress }] };
  }
  commit(document);
}

/** Forgets a saved player for good. Asked for explicitly, never as a side effect. */
export function removeProfileInStore(id: string): void {
  commit(removeProfile(snapshot.profiles, id));
}

/**
 * Removes one adult-to-child link without touching the child's player record.
 *
 * The adult panel can read a child who is not the active player, so this cannot use the
 * active-profile helper. Keeping the update here also makes unlinking deliberately
 * different from `removeProfileInStore`, which is the explicit local deletion action.
 */
export function unlinkChildFromAdultInStore(id: string, adultEmail: string): boolean {
  const child = snapshot.profiles.profiles.find((profile) => profile.id === id);
  if (
    !child ||
    child.progress.adultEmail !== null ||
    child.progress.guardian?.email !== adultEmail
  ) {
    return false;
  }

  const progress = withdrawGuardian(child.progress);
  commit({
    ...snapshot.profiles,
    profiles: snapshot.profiles.profiles.map((profile) =>
      profile.id === id ? { ...profile, progress } : profile
    )
  });
  return true;
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
