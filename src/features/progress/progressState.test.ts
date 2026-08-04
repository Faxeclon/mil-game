import { describe, expect, it } from "vitest";
import type { LevelId } from "@/features/levels/levelModel";
import * as progressState from "./progressState";
import {
  completeLevel,
  initialProgressState,
  markOnboarded,
  parseProgressState,
  PROGRESS_VERSION,
  resetProgressState
} from "./progressState";

describe("canonical level progress", () => {
  it("starts with the one canonical completion collection", () => {
    expect(initialProgressState).toEqual({
      version: PROGRESS_VERSION,
      completedLevelIds: [],
      playerName: null,
      apprenticeAvatarId: null
    });
    expect(initialProgressState.playerName).toBeNull();
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
    expect(parseProgressState({ version: 99, completedLevelIds: ["basics-1"] }).playerName).toBeNull();
    expect(parseProgressState({ version: PROGRESS_VERSION, completedLevelIds: "basics-1" })).toEqual({
      ...initialProgressState,
      playerName: null
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

  it("restores a valid profile name and safely omits missing or malformed names", () => {
    expect(
      parseProgressState({ version: PROGRESS_VERSION, playerName: "  Detective Eagle  " }).playerName
    ).toBe("Detective Eagle");
    expect(parseProgressState({ version: PROGRESS_VERSION }).playerName).toBeNull();
    expect(parseProgressState({ version: PROGRESS_VERSION, playerName: 42 }).playerName).toBeNull();
    expect(parseProgressState({ version: PROGRESS_VERSION, playerName: "   " }).playerName).toBeNull();
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
    const state = completeLevel(initialProgressState, "animals-1", {
      correctRounds: 2,
      totalRounds: 3
    });

    expect(state.completedLevelIds).toEqual(["animals-1"]);
    expect(state.lastResult).toEqual({ levelId: "animals-1", correctRounds: 2, totalRounds: 3 });
  });

  it("ignores an invalid runtime level id", () => {
    const invalidLevelId = "ghost-level" as LevelId;
    expect(completeLevel(initialProgressState, invalidLevelId)).toBe(initialProgressState);
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

    expect(current.lastResult).toEqual({ levelId: "basics-2", correctRounds: 3, totalRounds: 3 });
    expect(legacy.lastResult).toEqual({ levelId: "basics-1", correctRounds: 2, totalRounds: 3 });
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
    expect(state).toMatchObject({ onboarded: true, playerName: "Detective Eagle", apprenticeAvatarId: "owl" });
    expect(markOnboarded(state)).toBe(state);
  });

  it("survives a JSON round trip with canonical progress, result, onboarding and name", () => {
    const saved = completeLevel(markOnboarded(initialProgressState, "Detective Eagle", "rabbit"), "animals-1", {
      correctRounds: 2,
      totalRounds: 3
    });

    expect(parseProgressState(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it("returns to the initial canonical state on reset", () => {
    expect(resetProgressState()).toEqual(initialProgressState);
    expect(resetProgressState().playerName).toBeNull();
    expect(resetProgressState().apprenticeAvatarId).toBeNull();
  });
});
