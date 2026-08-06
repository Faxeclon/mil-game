import { describe, expect, it } from "vitest";
import type { LevelId } from "@/features/levels/levelModel";
import * as progressState from "./progressState";
import {
  completeLevel,
  initialProgressState,
  markOnboarded,
  needsLocalNicknameCompletion,
  parseProgressState,
  PROGRESS_VERSION,
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
      localNickname: null,
      apprenticeAvatarId: null,
      bestResultsByLevelId: {},
      streak: { currentDays: 0, bestDays: 0, lastPlayedOn: null }
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
      onboarded: true,
      localNickname: "Faxe",
      apprenticeAvatarId: "fox",
      bestResultsByLevelId: {},
      streak: { currentDays: 0, bestDays: 0, lastPlayedOn: null },
      lastResult: {
        levelId: "animals-1",
        correctRounds: 2,
        totalRounds: 3,
        attemptId: null,
        elapsedMs: null,
        completedAt: null,
        score: null
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
  it("stores the actual completed level id in the result", () => {
    const state = completeLevel(initialProgressState, "animals-1", completedAttempt);

    expect(state.completedLevelIds).toEqual(["animals-1"]);
    expect(state.lastResult).toEqual({ levelId: "animals-1", ...completedAttempt, score: null });
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
    expect(existing.lastResult).toEqual({ levelId: "basics-1", ...completedAttempt, score: null });
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
      score: null
    });
    expect(legacy.lastResult).toEqual({
      levelId: "basics-1",
      correctRounds: 2,
      totalRounds: 3,
      attemptId: null,
      elapsedMs: null,
      completedAt: null,
      score: null
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
      score: null
    });
    expect(malformed).toMatchObject({ localNickname: "Luz", apprenticeAvatarId: "owl" });
    expect(malformed.lastResult).toEqual({
      levelId: "animals-1",
      correctRounds: 1,
      totalRounds: 3,
      attemptId: null,
      elapsedMs: null,
      completedAt: null,
      score: null
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
