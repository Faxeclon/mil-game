import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProfilesDocument } from "@/features/profiles/localProfiles";
import {
  registerAdult,
  resetAdultAccountStoreForTests,
  signOutAdult
} from "@/features/adults/adultAccountStore";
import { initialProgressState } from "./progressState";
import { PROFILES_STORAGE_KEY, PROGRESS_STORAGE_KEY } from "./progressStorage";
import {
  completeLevelInStore,
  activateBonusOpportunityInStore,
  createBonusOpportunityInStore,
  consumeBonusOpportunityInStore,
  authorizeGuardianInStore,
  getProgressSnapshot,
  getServerProgressSnapshot,
  leaveLocalProfileInStore,
  markOnboardedInStore,
  removeProfileInStore,
  resetProgressInStore,
  selectProfileInStore,
  resetProgressStoreForTests,
  spinBonusWheelInStore,
  startAdultPlayInStore,
  subscribeToProgress,
  unlinkChildFromAdultInStore
} from "./progressStore";

const attemptedLevel = {
  attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
  correctRounds: 0,
  totalRounds: 1,
  elapsedMs: 0,
  completedAt: "2025-01-02T03:04:05.000Z"
};

function stubStorage(initialEntries: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initialEntries));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
      removeItem: (key: string) => void entries.delete(key)
    }
  });
  return entries;
}

beforeEach(() => {
  resetProgressStoreForTests();
  resetAdultAccountStoreForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetProgressStoreForTests();
  resetAdultAccountStoreForTests();
});

describe("progress store", () => {
  it("renders the empty snapshot on the server", () => {
    expect(getServerProgressSnapshot()).toEqual({
      hydrated: false,
      state: initialProgressState,
      profiles: emptyProfilesDocument
    });
  });

  it("loads the saved progress when the first subscriber arrives", () => {
    stubStorage({
      [PROGRESS_STORAGE_KEY]: JSON.stringify({ version: 1, completedLevelIds: ["basics-1"] })
    });

    expect(getProgressSnapshot().hydrated).toBe(false);
    const unsubscribe = subscribeToProgress(() => {});

    expect(getProgressSnapshot().hydrated).toBe(true);
    expect(getProgressSnapshot().state.completedLevelIds).toEqual(["basics-1"]);
    unsubscribe();
  });

  it("notifies subscribers and writes to storage when a level is completed", () => {
    const entries = stubStorage();
    const listener = vi.fn();
    const unsubscribe = subscribeToProgress(listener);
    listener.mockClear();

    completeLevelInStore("animals-1", {
      correctRounds: 3,
      totalRounds: 3,
      attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
      elapsedMs: 1_234,
      completedAt: "2025-01-02T03:04:05.000Z"
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getProgressSnapshot().state.completedLevelIds).toEqual(["animals-1"]);
    expect(getProgressSnapshot().state.lastResult).toEqual({
      levelId: "animals-1",
      correctRounds: 3,
      totalRounds: 3,
      attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
      elapsedMs: 1_234,
      completedAt: "2025-01-02T03:04:05.000Z",
      score: null
    });
    expect(entries.has(PROFILES_STORAGE_KEY)).toBe(true);
    unsubscribe();
  });

  it("keeps one completed level while recording a new replay attempt", () => {
    stubStorage();
    const listener = vi.fn();
    const unsubscribe = subscribeToProgress(listener);
    completeLevelInStore("basics-1", attemptedLevel);
    listener.mockClear();

    completeLevelInStore("basics-1", { ...attemptedLevel, attemptId: "attempt_abcdefab-cdef-abcd-efab-cdefabcdefab" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getProgressSnapshot().state.completedLevelIds).toEqual(["basics-1"]);
    expect(getProgressSnapshot().state.lastResult?.attemptId).toBe("attempt_abcdefab-cdef-abcd-efab-cdefabcdefab");
    unsubscribe();
  });

  it("returns the player to the start on reset", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    completeLevelInStore("basics-1", attemptedLevel);

    resetProgressInStore();

    expect(getProgressSnapshot().state.completedLevelIds).toEqual([]);
    unsubscribe();
  });

  /*
   * A reset restarts the game, it does not unmake the child. Wiping the nickname too was
   * the old behaviour, and it landed them back on the form asking who they are - which is
   * exactly what "erase my progress" should never do.
   */
  it("clears the game but keeps the player after a reset", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Roqui 47", "fox");
    completeLevelInStore("basics-1", attemptedLevel);

    resetProgressInStore();
    const state = getProgressSnapshot().state;

    expect(state.completedLevelIds).toEqual([]);
    expect(state.bestResultsByLevelId).toEqual({});
    expect(state.rushUnlockedIslands).toEqual([]);
    // The map is new again, so its one-time tour plays again.
    expect(state.mapOnboardingStage).toBe("map-island");

    expect(state.localNickname).toBe("Roqui 47");
    expect(state.apprenticeAvatarId).toBe("fox");
    expect(state.onboarded).toBe(true);
    unsubscribe();
  });

  it("keeps Bonus opportunities with the active profile only", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    const firstId = getProgressSnapshot().profiles.activeId;
    createBonusOpportunityInStore({
      id: "section-bonus:animals:attempt-1",
      categoryKey: "animals",
      islandKey: "difference",
      destination: { kind: "island", islandKey: "difference" }
    });
    // Activate it in the same profile so a persisted wheel result is profile-local too.
    activateBonusOpportunityInStore("section-bonus:animals:attempt-1");
    spinBonusWheelInStore("section-bonus:animals:attempt-1", () => 0);
    leaveLocalProfileInStore();
    markOnboardedInStore("Noa", "owl");

    expect(getProgressSnapshot().state.bonusOpportunities).toEqual([]);
    selectProfileInStore(firstId ?? "");
    expect(getProgressSnapshot().state.bonusOpportunities).toHaveLength(1);
    expect(getProgressSnapshot().state.bonusOpportunities[0]?.wheel).toMatchObject({ status: "resolved", reward: "extra-life" });
    consumeBonusOpportunityInStore("section-bonus:animals:attempt-1");
    expect(getProgressSnapshot().state.bonusOpportunities[0]?.status).toBe("consumed");
    unsubscribe();
  });

});

/**
 * A grown-up who signed in already answered the only question this game asks - who are
 * you - so the game has to open, not a second sign-up form.
 */
describe("a grown-up playing as themselves", () => {
  it("becomes a player with no form and no questions", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});

    startAdultPlayInStore("marta@example.com", "marta");
    const { state } = getProgressSnapshot();

    expect(state.onboarded).toBe(true);
    expect(state.localNickname).toBe("marta");
    expect(state.adultEmail).toBe("marta@example.com");
    unsubscribe();
  });

  /*
   * Their game is a profile like any other, so leaving to run a lesson and coming back
   * has to return them to their own medals rather than a blank start.
   */
  it("returns to the same game rather than starting another one", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    startAdultPlayInStore("marta@example.com", "marta");
    completeLevelInStore("basics-1", attemptedLevel);
    leaveLocalProfileInStore();

    startAdultPlayInStore("marta@example.com", "marta");
    const { state, profiles } = getProgressSnapshot();

    expect(profiles.profiles).toHaveLength(1);
    expect(state.completedLevelIds).toEqual(["basics-1"]);
    unsubscribe();
  });

  /*
   * The child keeps everything. A grown-up picking up the phone to try a round must not
   * cost the player whose medals were on it.
   */
  it("steps away from the child playing instead of writing over them", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    completeLevelInStore("basics-1", attemptedLevel);

    startAdultPlayInStore("marta@example.com", "marta");
    const { state, profiles } = getProgressSnapshot();

    expect(profiles.profiles).toHaveLength(2);
    expect(profiles.profiles[0].progress.localNickname).toBe("Lu");
    expect(profiles.profiles[0].progress.completedLevelIds).toEqual(["basics-1"]);
    // The grown-up starts their own game, not inside the child's.
    expect(state.completedLevelIds).toEqual([]);
    expect(state.localNickname).toBe("marta");
    unsubscribe();
  });

  it("refuses to make a nameless profile out of nothing", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});

    startAdultPlayInStore("   ", "   ");

    expect(getProgressSnapshot().profiles.profiles).toHaveLength(0);
    unsubscribe();
  });

  it("keeps the active child's complete progress unchanged until the grown-up explicitly starts playing", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    completeLevelInStore("basics-1", { ...attemptedLevel, score: 900, playedOn: "2026-08-08" });
    const beforeAdultPanel = getProgressSnapshot();
    const childId = beforeAdultPanel.profiles.activeId;
    const childProgress = beforeAdultPanel.state;

    // Signing in and reading the adult panel are viewing actions, not profile selection.
    expect(registerAdult("marta@example.com", "family", "2026-08-08")).toBe(true);
    expect(getProgressSnapshot().profiles.activeId).toBe(childId);
    expect(getProgressSnapshot().state).toEqual(childProgress);

    expect(startAdultPlayInStore("marta@example.com", "marta")).toBe(true);
    const afterAdultStarts = getProgressSnapshot();
    const child = afterAdultStarts.profiles.profiles.find((profile) => profile.id === childId);

    expect(afterAdultStarts.profiles.activeId).not.toBe(childId);
    expect(afterAdultStarts.state.adultEmail).toBe("marta@example.com");
    expect(child?.progress).toEqual(childProgress);
    expect(afterAdultStarts.profiles.profiles).toHaveLength(2);
    unsubscribe();
  });

  it("reuses the grown-up's player profile instead of creating a duplicate", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});

    expect(startAdultPlayInStore("marta@example.com", "marta")).toBe(true);
    const firstAdultId = getProgressSnapshot().profiles.activeId;
    leaveLocalProfileInStore();

    expect(startAdultPlayInStore("marta@example.com", "marta")).toBe(true);

    expect(getProgressSnapshot().profiles.activeId).toBe(firstAdultId);
    expect(getProgressSnapshot().profiles.profiles).toHaveLength(1);
    expect(getProgressSnapshot().profiles.profiles[0].progress.adultEmail).toBe("marta@example.com");
    unsubscribe();
  });

  it("writes a grown-up's mission result only to the grown-up's profile", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    completeLevelInStore("basics-1", { ...attemptedLevel, score: 900, playedOn: "2026-08-08" });
    const childId = getProgressSnapshot().profiles.activeId;
    const childProgress = getProgressSnapshot().state;

    startAdultPlayInStore("marta@example.com", "marta");
    completeLevelInStore("animals-1", {
      ...attemptedLevel,
      attemptId: "attempt_abcdefab-cdef-abcd-efab-cdefabcdefab",
      score: 750,
      playedOn: "2026-08-08"
    });

    const { state, profiles } = getProgressSnapshot();
    expect(state.completedLevelIds).toEqual(["animals-1"]);
    expect(profiles.profiles.find((profile) => profile.id === childId)?.progress).toEqual(childProgress);
    unsubscribe();
  });

  it("does not touch the active child when a grown-up enters and leaves their panel without playing", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    completeLevelInStore("basics-1", attemptedLevel);
    const childId = getProgressSnapshot().profiles.activeId;
    const childProgress = getProgressSnapshot().state;

    expect(registerAdult("marta@example.com", "family", "2026-08-08")).toBe(true);
    signOutAdult();

    expect(getProgressSnapshot().profiles.activeId).toBe(childId);
    expect(getProgressSnapshot().state).toEqual(childProgress);
    expect(getProgressSnapshot().profiles.profiles).toHaveLength(1);
    unsubscribe();
  });
});

describe("unlinking a child from an adult account", () => {
  const linkedAttempt = {
    attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
    correctRounds: 3,
    totalRounds: 3,
    elapsedMs: 9_000,
    completedAt: "2026-08-08T10:00:00.000Z",
    score: 900,
    playedOn: "2026-08-08"
  };

  it("removes only the adult link and keeps every part of the linked child's profile", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    completeLevelInStore("basics-1", linkedAttempt);
    authorizeGuardianInStore("marta@example.com", "2026-08-08");
    const before = getProgressSnapshot();
    const childId = before.profiles.activeId;

    expect(unlinkChildFromAdultInStore(childId ?? "", "marta@example.com")).toBe(true);

    const after = getProgressSnapshot();
    expect(after.profiles.profiles).toHaveLength(1);
    expect(after.profiles.activeId).toBe(childId);
    expect(after.state.guardian).toBeNull();
    expect({ ...after.state, guardian: before.state.guardian }).toEqual(before.state);
    unsubscribe();
  });

  it("keeps an unlinked child active and ready to play without onboarding again", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    authorizeGuardianInStore("marta@example.com", "2026-08-08");
    const childId = getProgressSnapshot().profiles.activeId;

    unlinkChildFromAdultInStore(childId ?? "", "marta@example.com");

    expect(getProgressSnapshot().profiles.activeId).toBe(childId);
    expect(getProgressSnapshot().state.onboarded).toBe(true);
    expect(getProgressSnapshot().state.localNickname).toBe("Lu");
    unsubscribe();
  });

  it("relinks the existing child profile without making a duplicate or losing progress", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    completeLevelInStore("basics-1", linkedAttempt);
    authorizeGuardianInStore("marta@example.com", "2026-08-08");
    const childId = getProgressSnapshot().profiles.activeId;
    const childProgress = getProgressSnapshot().state;

    unlinkChildFromAdultInStore(childId ?? "", "marta@example.com");
    authorizeGuardianInStore("marta@example.com", "2026-08-09");

    const after = getProgressSnapshot();
    expect(after.profiles.profiles).toHaveLength(1);
    expect(after.profiles.activeId).toBe(childId);
    expect(after.state.guardian?.email).toBe("marta@example.com");
    expect({ ...after.state, guardian: childProgress.guardian }).toEqual(childProgress);
    unsubscribe();
  });

  it("does not affect another profile when unlinking a child who is not active", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    completeLevelInStore("basics-1", linkedAttempt);
    authorizeGuardianInStore("marta@example.com", "2026-08-08");
    const firstChildId = getProgressSnapshot().profiles.activeId;

    leaveLocalProfileInStore();
    markOnboardedInStore("Noa", "owl");
    completeLevelInStore("animals-1", {
      ...linkedAttempt,
      attemptId: "attempt_abcdefab-cdef-abcd-efab-cdefabcdefab"
    });
    const secondChildId = getProgressSnapshot().profiles.activeId;
    const secondChildProgress = getProgressSnapshot().state;

    expect(unlinkChildFromAdultInStore(firstChildId ?? "", "marta@example.com")).toBe(true);

    const after = getProgressSnapshot();
    expect(after.profiles.activeId).toBe(secondChildId);
    expect(after.state).toEqual(secondChildProgress);
    expect(after.profiles.profiles.find((profile) => profile.id === firstChildId)?.progress.guardian).toBeNull();
    unsubscribe();
  });

  it("keeps unlinking separate from explicit local profile deletion", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    authorizeGuardianInStore("marta@example.com", "2026-08-08");
    const childId = getProgressSnapshot().profiles.activeId;

    unlinkChildFromAdultInStore(childId ?? "", "marta@example.com");
    expect(getProgressSnapshot().profiles.profiles).toHaveLength(1);

    removeProfileInStore(childId ?? "");
    expect(getProgressSnapshot().profiles.profiles).toHaveLength(0);
    unsubscribe();
  });
});
