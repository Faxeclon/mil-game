import { describe, expect, it } from "vitest";
import type { LevelId } from "@/features/levels/levelModel";
import * as progressState from "./progressState";
import {
  completeLevel,
  didPassLevelAttempt,
  initialProgressState,
  markOnboarded,
  needsLocalNicknameCompletion,
  parseProgressState,
  PROGRESS_VERSION,
  resetProgressKeepingProfile,
  resetProgressState
} from "./progressState";

const completedAttempt = {
  attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
  correctRounds: 2,
  totalRounds: 3,
  elapsedMs: 1_234,
  completedAt: "2025-01-02T03:04:05.000Z"
};

describe("canonical level progress", () => {
  it("starts with the one canonical completion collection", () => {
    expect(initialProgressState).toEqual({
      version: PROGRESS_VERSION,
      completedLevelIds: [],
      bonusOpportunities: [],
      achievementIds: [],
      pendingAchievementCelebrationIds: [],
      rushUnlockedIslands: [],
      rankMissionCeiling: 13,
      mapOnboardingStage: "map-island",
      localNickname: null,
      apprenticeAvatarId: null,
      bestResultsByLevelId: {},
      streak: { currentDays: 0, bestDays: 0, lastPlayedOn: null },
      guardian: null,
      adultEmail: null,
      playedMs: 0
    });
    expect(initialProgressState.localNickname).toBeNull();
    expect(initialProgressState.apprenticeAvatarId).toBeNull();
    expect("completedMissionIds" in initialProgressState).toBe(false);
    expect("completeMission" in progressState).toBe(false);
  });

  it("keeps only authored, unique level ids from stored data", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      completedLevelIds: ["animals-1", "basics-1", "animals-1", "removed-level", 42, null]
    });

    expect(state.completedLevelIds).toEqual(["animals-1", "basics-1"]);
  });

  it("returns a fresh state for malformed stored values", () => {
    expect(parseProgressState(undefined)).toEqual(initialProgressState);
    expect(parseProgressState("not-an-object")).toEqual(initialProgressState);
    expect(parseProgressState({})).toEqual(initialProgressState);
    expect(parseProgressState({ version: 99, completedLevelIds: ["basics-1"] })).toEqual(initialProgressState);
    expect(parseProgressState({ version: 99, completedLevelIds: ["basics-1"] }).localNickname).toBeNull();
    expect(parseProgressState({ version: PROGRESS_VERSION, completedLevelIds: "basics-1" })).toEqual({
      ...initialProgressState,
      mapOnboardingStage: "complete",
      localNickname: null
    });
  });
});

describe("legacy migration", () => {
  it("migrates only the unambiguous legacy training completion", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      completedMissionIds: ["training", "source", "training", "unknown"]
    });

    expect(state.completedLevelIds).toEqual(["basics-1"]);
    expect("completedMissionIds" in state).toBe(false);
    expect(state.onboarded).toBe(true);
  });

  it("combines valid canonical values with an unambiguous legacy migration", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      completedLevelIds: ["basics-2", "removed-level"],
      completedMissionIds: ["training", "context"]
    });

    expect(state.completedLevelIds).toEqual(["basics-2", "basics-1"]);
  });

  it("keeps Rush rewards and rank scale earned before the catalog grew without inventing missions", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      completedLevelIds: ["basics-1", "basics-2", "animals-1", "animals-2", "animals-3", "sports-1", "sports-2", "creators-1"]
    });

    expect(state.completedLevelIds).toHaveLength(8);
    expect(state.rushUnlockedIslands).toEqual(["training", "difference", "source"]);
    expect(state.rankMissionCeiling).toBe(8);
  });

  it("retains legacy Rush unlock data without turning it into a Bonus ticket", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      completedLevelIds: ["animals-1"],
      rushUnlockedIslands: ["difference"]
    });

    expect(state.completedLevelIds).toEqual(["animals-1"]);
    expect(state.rushUnlockedIslands).toEqual(["difference"]);
    expect(state.bonusOpportunities).toEqual([]);
    expect(state.achievementIds).toEqual([]);
    expect(state.pendingAchievementCelebrationIds).toEqual([]);
  });

  it("normalizes older progress without achievements without losing other progress", () => {
    const state = parseProgressState({ version: PROGRESS_VERSION, completedLevelIds: ["animals-1"] });
    expect(state.completedLevelIds).toEqual(["animals-1"]);
    expect(state.achievementIds).toEqual([]);
    expect(state.pendingAchievementCelebrationIds).toEqual([]);
  });

  it("migrates playerName to the canonical device-only local nickname without losing progress", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      playerName: "  Faxe  ",
      completedLevelIds: ["animals-1"],
      onboarded: true,
      apprenticeAvatarId: "fox",
      bestResultsByLevelId: {},
      lastResult: { levelId: "animals-1", correctRounds: 2, totalRounds: 3 }
    });

    expect(state).toEqual({
      version: PROGRESS_VERSION,
      completedLevelIds: ["animals-1"],
      bonusOpportunities: [],
      achievementIds: [],
      pendingAchievementCelebrationIds: [],
      rushUnlockedIslands: [],
      rankMissionCeiling: 8,
      mapOnboardingStage: "complete",
      onboarded: true,
      localNickname: "Faxe",
      apprenticeAvatarId: "fox",
      bestResultsByLevelId: {},
      streak: { currentDays: 0, bestDays: 0, lastPlayedOn: null },
      guardian: null,
      adultEmail: null,
      playedMs: 0,
      lastResult: {
        levelId: "animals-1",
        correctRounds: 2,
        totalRounds: 3,
        attemptId: null,
        elapsedMs: null,
        completedAt: null,
        score: null,
        passed: true
      }
    });
    expect("playerName" in state).toBe(false);
  });

  it("restores a valid canonical nickname and drops malformed legacy names", () => {
    expect(parseProgressState({ version: PROGRESS_VERSION, localNickname: "  María  " }).localNickname).toBe("María");
    expect(parseProgressState({ version: PROGRESS_VERSION, playerName: 42 }).localNickname).toBeNull();
    expect(parseProgressState({ version: PROGRESS_VERSION, playerName: "   " }).localNickname).toBeNull();
  });

  it("restores only an authored apprentice avatar id", () => {
    expect(parseProgressState({ version: PROGRESS_VERSION, apprenticeAvatarId: "owl" }).apprenticeAvatarId).toBe("owl");
    expect(parseProgressState({ version: PROGRESS_VERSION }).apprenticeAvatarId).toBeNull();
    expect(parseProgressState({ version: PROGRESS_VERSION, apprenticeAvatarId: "roqui" }).apprenticeAvatarId).toBeNull();
    expect(parseProgressState({ version: PROGRESS_VERSION, apprenticeAvatarId: 42 }).apprenticeAvatarId).toBeNull();
  });
});

describe("results", () => {
  it("requires a strict majority for both odd and even mission lengths", () => {
    expect(didPassLevelAttempt(3, 3)).toBe(true);
    expect(didPassLevelAttempt(2, 3)).toBe(true);
    expect(didPassLevelAttempt(1, 3)).toBe(false);
    expect(didPassLevelAttempt(0, 3)).toBe(false);
    expect(didPassLevelAttempt(3, 4)).toBe(true);
    expect(didPassLevelAttempt(2, 4)).toBe(false);
  });

  it("keeps a failed new attempt out of progress while retaining its result", () => {
    const failed = completeLevel(initialProgressState, "animals-1", {
      ...completedAttempt,
      correctRounds: 1,
      attemptId: "attempt_failed-123e4567-e89b-12d3-a456-426614174000"
    });

    expect(failed.completedLevelIds).toEqual([]);
    expect(failed.lastResult).toMatchObject({ levelId: "animals-1", passed: false });
  });

  it("does not revoke an earlier completion when a replay fails", () => {
    const passed = completeLevel(initialProgressState, "animals-1", completedAttempt);
    const failedReplay = completeLevel(passed, "animals-1", {
      ...completedAttempt,
      correctRounds: 1,
      attemptId: "attempt_failed-223e4567-e89b-12d3-a456-426614174000"
    });

    expect(failedReplay.completedLevelIds).toEqual(["animals-1"]);
    expect(failedReplay.bestResultsByLevelId).toEqual(passed.bestResultsByLevelId);
    expect(failedReplay.lastResult).toMatchObject({ passed: false });
  });

  it("stores the actual completed level id in the result", () => {
    const state = completeLevel(initialProgressState, "animals-1", completedAttempt);

    expect(state.completedLevelIds).toEqual(["animals-1"]);
    expect(state.lastResult).toEqual({ levelId: "animals-1", ...completedAttempt, score: null, passed: true });
  });

  /*
   * A grown-up reading "how long has my child been on this" needs the honest total, and
   * the records only keep each mission's best run - so replaying five times would look
   * like playing once if this were worked out from them.
   */
  it("adds up every run, replays included, not only the best ones", () => {
    let state = completeLevel(initialProgressState, "animals-1", completedAttempt);
    state = completeLevel(state, "animals-1", completedAttempt);

    expect(state.completedLevelIds).toEqual(["animals-1"]);
    expect(state.playedMs).toBe(completedAttempt.elapsedMs * 2);
  });

  it("counts a completed mission's elapsed time even when its rounds were incorrect or timed out", () => {
    const timedOutCompletion = {
      ...completedAttempt,
      attemptId: "attempt_abcdefab-cdef-abcd-efab-cdefabcdefab",
      correctRounds: 0,
      elapsedMs: 6_000,
      playedOn: "2025-01-02"
    };

    const state = completeLevel(initialProgressState, "animals-1", timedOutCompletion);

    expect(state.playedMs).toBe(6_000);
    expect(state.completedLevelIds).toEqual([]);
    expect(state.streak.lastPlayedOn).toBe("2025-01-02");
  });

  it("does not create mission time or a completion date before a mission is completed", () => {
    const state = markOnboarded(initialProgressState, "Luz");

    expect(state.playedMs).toBe(0);
    expect(state.streak.lastPlayedOn).toBeNull();
  });

  it("starts the clock again when the child asks to start over", () => {
    const played = completeLevel(initialProgressState, "animals-1", completedAttempt);

    expect(resetProgressKeepingProfile(played).playedMs).toBe(0);
  });

  it("clears achievements on reset while keeping identity and guardian", () => {
    const state = {
      ...initialProgressState,
      achievementIds: ["bonus-perfect-training" as const],
      localNickname: "Luz",
      guardian: { email: "adult@example.com", authorizedOn: "2026-08-09", syncPending: true }
    };
    const reset = resetProgressKeepingProfile(state);
    expect(reset.achievementIds).toEqual([]);
    expect(reset.pendingAchievementCelebrationIds).toEqual([]);
    expect(reset.localNickname).toBe("Luz");
    expect(reset.guardian).toEqual(state.guardian);
  });

  it("ignores an invalid runtime level id", () => {
    const invalidLevelId = "ghost-level" as LevelId;
    expect(completeLevel(initialProgressState, invalidLevelId, completedAttempt)).toBe(initialProgressState);
  });

  it("requires a complete attempt at the type and runtime boundaries", () => {
    // @ts-expect-error A gameplay completion requires a LevelAttempt.
    expect(completeLevel(initialProgressState, "basics-1")).toBe(initialProgressState);
  });

  it("ignores malformed attempts without completing the level or replacing an earlier result", () => {
    const existing = completeLevel(initialProgressState, "basics-1", completedAttempt);
    const malformedAttempts = [
      { ...completedAttempt, attemptId: "bad id" },
      { ...completedAttempt, elapsedMs: -1 },
      { ...completedAttempt, completedAt: "not-a-date" },
      { ...completedAttempt, totalRounds: 0 },
      { ...completedAttempt, correctRounds: Number.NaN }
    ];

    for (const malformed of malformedAttempts) {
      expect(completeLevel(existing, "animals-1", malformed)).toBe(existing);
    }
    expect(existing.completedLevelIds).toEqual(["basics-1"]);
    expect(existing.lastResult).toEqual({ levelId: "basics-1", ...completedAttempt, score: null, passed: true });
  });

  it("normalizes current results and migrates the unambiguous legacy result identity", () => {
    const current = parseProgressState({
      version: PROGRESS_VERSION,
      completedLevelIds: ["basics-2"],
      lastResult: { levelId: "basics-2", correctRounds: 9, totalRounds: 3 }
    });
    const legacy = parseProgressState({
      version: PROGRESS_VERSION,
      completedMissionIds: ["training"],
      lastResult: { missionId: "training", correctRounds: 2, totalRounds: 3 }
    });

    expect(current.lastResult).toEqual({
      levelId: "basics-2",
      correctRounds: 3,
      totalRounds: 3,
      attemptId: null,
      elapsedMs: null,
      completedAt: null,
      score: null,
      passed: true
    });
    expect(legacy.lastResult).toEqual({
      levelId: "basics-1",
      correctRounds: 2,
      totalRounds: 3,
      attemptId: null,
      elapsedMs: null,
      completedAt: null,
      score: null,
      passed: true
    });
  });

  it("normalizes valid metadata and drops malformed metadata without losing the result", () => {
    const valid = parseProgressState({
      version: PROGRESS_VERSION,
      localNickname: "Luz",
      apprenticeAvatarId: "owl",
      lastResult: {
        levelId: "animals-1",
        correctRounds: 1,
        totalRounds: 3,
        attemptId: completedAttempt.attemptId,
        elapsedMs: 123.9,
        completedAt: "2025-01-02T03:04:05Z"
      }
    });
    const malformed = parseProgressState({
      version: PROGRESS_VERSION,
      localNickname: "Luz",
      apprenticeAvatarId: "owl",
      lastResult: {
        levelId: "animals-1",
        correctRounds: 1,
        totalRounds: 3,
        attemptId: "bad id\n",
        elapsedMs: -1,
        completedAt: "not-a-date"
      }
    });

    expect(valid.lastResult).toEqual({
      levelId: "animals-1",
      correctRounds: 1,
      totalRounds: 3,
      attemptId: completedAttempt.attemptId,
      elapsedMs: 123,
      completedAt: "2025-01-02T03:04:05.000Z",
      score: null,
      passed: false
    });
    expect(malformed).toMatchObject({ localNickname: "Luz", apprenticeAvatarId: "owl" });
    expect(malformed.lastResult).toEqual({
      levelId: "animals-1",
      correctRounds: 1,
      totalRounds: 3,
      attemptId: null,
      elapsedMs: null,
      completedAt: null,
      score: null,
      passed: false
    });
  });

  it("drops a result with an unknown current or legacy identity", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      lastResult: { levelId: "removed-level", correctRounds: 1, totalRounds: 3 }
    });

    expect(state.lastResult).toBeUndefined();
  });
});

describe("onboarding and reset", () => {
  it("keeps the selected apprentice separate from Roqui when onboarding", () => {
    const state = markOnboarded(initialProgressState, "Detective Eagle", "owl");
    expect(state).toMatchObject({ onboarded: true, localNickname: "Detective Eagle", apprenticeAvatarId: "owl" });
    expect(markOnboarded(state)).toBe(state);
  });

  it("survives a JSON round trip with canonical progress, result, onboarding and nickname", () => {
    const saved = completeLevel(markOnboarded(initialProgressState, "Detective Eagle", "rabbit"), "animals-1", completedAttempt);

    expect(parseProgressState(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it("returns to the initial canonical state on reset", () => {
    expect(resetProgressState()).toEqual(initialProgressState);
    expect(resetProgressState().localNickname).toBeNull();
    expect(resetProgressState().apprenticeAvatarId).toBeNull();
  });

  it("requires only nickname completion for returning progress with no nickname", () => {
    const returning = parseProgressState({
      version: PROGRESS_VERSION,
      completedLevelIds: ["basics-1"],
      apprenticeAvatarId: "owl"
    });
    const completedProfile = markOnboarded(returning, "Luz");

    expect(needsLocalNicknameCompletion(returning)).toBe(true);
    expect(needsLocalNicknameCompletion(completedProfile)).toBe(false);
    expect(completedProfile).toMatchObject({
      completedLevelIds: ["basics-1"],
      apprenticeAvatarId: "owl",
      localNickname: "Luz"
    });
  });
});
