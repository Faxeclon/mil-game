import { describe, expect, it } from "vitest";
import {
  completeLevel,
  initialProgressState,
  markOnboarded,
  resetProgressKeepingProfile,
  type ProgressState
} from "./progressState";

/** A player partway through the game, with everything a run accumulates. */
function playerInProgress(): ProgressState {
  let state = markOnboarded(initialProgressState, "Roqui 47", "fox");
  // An attempt id under 16 characters is discarded, which would leave nothing to erase
  // and quietly turn every assertion below into a test of an empty state.
  state = completeLevel(state, "basics-1", {
    attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
    correctRounds: 3,
    totalRounds: 3,
    elapsedMs: 9000,
    completedAt: "2026-08-08T10:00:00.000Z",
    score: 1000,
    playedOn: "2026-08-08"
  });
  state = completeLevel(state, "basics-2", {
    attemptId: "attempt_9f8b7c6d-5e4a-3b2c-1d0e-fedcba987654",
    correctRounds: 2,
    totalRounds: 3,
    elapsedMs: 12000,
    completedAt: "2026-08-08T10:05:00.000Z",
    score: 640,
    playedOn: "2026-08-08"
  });

  return {
    ...state,
    // Earned rewards and a finished tour, both of which must not outlive the reset.
    rushUnlockedIslands: ["training"],
    mapOnboardingStage: "complete",
    guardian: { email: "mama@example.com", authorizedOn: "2026-08-01", syncPending: true }
  };
}

describe("starting the game over", () => {
  /*
   * Without this, a fixture that silently failed to record anything would make every
   * assertion below pass against an already-empty state.
   */
  it("really has something to erase in the first place", () => {
    const before = playerInProgress();

    expect(before.completedLevelIds).toEqual(["basics-1", "basics-2"]);
    expect(Object.keys(before.bestResultsByLevelId)).toHaveLength(2);
    expect(before.streak.currentDays).toBeGreaterThan(0);
  });

  it("erases the missions, records and streak", () => {
    const reset = resetProgressKeepingProfile(playerInProgress());

    expect(reset.completedLevelIds).toEqual([]);
    expect(reset.bestResultsByLevelId).toEqual({});
    expect(reset.streak).toEqual(initialProgressState.streak);
    expect(reset.lastResult).toBeUndefined();
  });

  /*
   * Rush rewards are stored rather than derived so an earned one survives new content.
   * That same durability would otherwise let them survive a reset the child asked for.
   */
  it("takes back a Rush unlocked by progress", () => {
    expect(resetProgressKeepingProfile(playerInProgress()).rushUnlockedIslands).toEqual([]);
  });

  it("plays the map tour again, because the map is new again", () => {
    expect(resetProgressKeepingProfile(playerInProgress()).mapOnboardingStage).toBe("map-island");
  });

  /*
   * The bug this replaces: wiping the whole state took the nickname with it, so erasing
   * progress landed the child back on the form asking who they are.
   */
  it("keeps the name and the avatar, so nobody is asked who they are twice", () => {
    const before = playerInProgress();
    const reset = resetProgressKeepingProfile(before);

    expect(reset.localNickname).toBe(before.localNickname);
    expect(reset.apprenticeAvatarId).toBe(before.apprenticeAvatarId);
    expect(reset.onboarded).toBe(true);
  });

  it("keeps the adult who authorised them, which was never progress", () => {
    const before = playerInProgress();

    expect(resetProgressKeepingProfile(before).guardian).toEqual(before.guardian);
  });

  it("leaves the original untouched, so a cancelled confirmation costs nothing", () => {
    const before = playerInProgress();
    const copy = JSON.parse(JSON.stringify(before));

    resetProgressKeepingProfile(before);

    expect(before).toEqual(copy);
  });

  it("gives back a state the rest of the game already knows how to read", () => {
    const reset = resetProgressKeepingProfile(playerInProgress());

    expect(reset.version).toBe(initialProgressState.version);
    expect(reset.rankMissionCeiling).toBe(initialProgressState.rankMissionCeiling);
  });

  it("resets a player who had barely started without inventing anything", () => {
    const fresh = markOnboarded(initialProgressState, "Tunki 12", "owl");

    expect(resetProgressKeepingProfile(fresh)).toEqual(fresh);
  });
});
