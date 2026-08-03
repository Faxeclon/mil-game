import { describe, expect, it } from "vitest";
import {
  completeMission,
  getAvailableMissionId,
  getMissionForRoute,
  getMissionState,
  initialProgressState,
  isMissionUnlocked,
  isRouteUnlocked,
  markOnboarded,
  parseProgressState,
  PROGRESS_VERSION,
  resetProgressState
} from "./progressState";

describe("initial progress", () => {
  it("starts with no mission completed and the first one open", () => {
    expect(initialProgressState.completedMissionIds).toEqual([]);
    expect(getAvailableMissionId(initialProgressState)).toBe("training");
    expect(getMissionState(initialProgressState, "training")).toBe("available");
  });

  it("keeps every later mission locked", () => {
    for (const missionId of ["source", "context", "voices", "videos", "share"] as const) {
      expect(getMissionState(initialProgressState, missionId)).toBe("locked");
      expect(isMissionUnlocked(initialProgressState, missionId)).toBe(false);
    }
  });
});

describe("completing a mission", () => {
  it("marks it completed and opens exactly the next one", () => {
    const state = completeMission(initialProgressState, "training");

    expect(getMissionState(state, "training")).toBe("completed");
    expect(getMissionState(state, "source")).toBe("available");
    expect(getAvailableMissionId(state)).toBe("source");
    for (const missionId of ["context", "voices", "videos", "share"] as const) {
      expect(getMissionState(state, missionId)).toBe("locked");
    }
  });

  it("never stores the same mission twice", () => {
    const once = completeMission(initialProgressState, "training");
    const twice = completeMission(once, "training");

    expect(twice.completedMissionIds).toEqual(["training"]);
    expect(getAvailableMissionId(twice)).toBe("source");
  });

  it("records the attempt and the mission last played", () => {
    const state = completeMission(initialProgressState, "training", {
      missionId: "training",
      correctRounds: 2,
      totalRounds: 3
    });

    expect(state.lastPlayedMissionId).toBe("training");
    expect(state.lastResult).toEqual({ missionId: "training", correctRounds: 2, totalRounds: 3 });
  });

  it("reports no available mission once every mission is finished", () => {
    let state = initialProgressState;
    for (const missionId of ["training", "source", "context", "voices", "videos", "share"] as const) {
      state = completeMission(state, missionId);
    }
    expect(getAvailableMissionId(state)).toBeNull();
  });
});

describe("reading stored progress", () => {
  it("recovers a fresh state from corrupt or foreign data", () => {
    expect(parseProgressState(undefined)).toEqual(initialProgressState);
    expect(parseProgressState("not-an-object")).toEqual(initialProgressState);
    expect(parseProgressState({})).toEqual(initialProgressState);
    expect(parseProgressState({ version: 99, completedMissionIds: ["training"] })).toEqual(initialProgressState);
    expect(parseProgressState({ version: PROGRESS_VERSION, completedMissionIds: "training" })).toEqual(
      initialProgressState
    );
  });

  it("ignores unknown mission ids and duplicates, and restores the canonical order", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      completedMissionIds: ["source", "ghost-mission", "training", "training"]
    });

    expect(state.completedMissionIds).toEqual(["training", "source"]);
    expect(getAvailableMissionId(state)).toBe("context");
  });

  it("drops a result that does not describe a real attempt", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      completedMissionIds: ["training"],
      lastResult: { missionId: "ghost-mission", correctRounds: 1, totalRounds: 3 }
    });

    expect(state.lastResult).toBeUndefined();
  });

  it("keeps a valid result and clamps an impossible score", () => {
    const state = parseProgressState({
      version: PROGRESS_VERSION,
      completedMissionIds: ["training"],
      lastResult: { missionId: "training", correctRounds: 9, totalRounds: 3 }
    });

    expect(state.lastResult).toEqual({ missionId: "training", correctRounds: 3, totalRounds: 3 });
  });

  it("survives a round trip through JSON, as a reload does", () => {
    const saved = completeMission(initialProgressState, "training", {
      missionId: "training",
      correctRounds: 3,
      totalRounds: 3
    });
    const restored = parseProgressState(JSON.parse(JSON.stringify(saved)));

    expect(restored.completedMissionIds).toEqual(["training"]);
    expect(getAvailableMissionId(restored)).toBe("source");
    expect(restored.lastResult).toEqual({ missionId: "training", correctRounds: 3, totalRounds: 3 });
  });
});

describe("route protection", () => {
  it("only opens the tutorial route before anything is completed", () => {
    expect(isRouteUnlocked(initialProgressState, "/tutorial")).toBe(true);
    expect(isRouteUnlocked(initialProgressState, "/case")).toBe(false);
    expect(getMissionForRoute(initialProgressState, "/case")).toBeNull();
  });

  it("opens the case route once the first mission is completed", () => {
    const state = completeMission(initialProgressState, "training");

    expect(isRouteUnlocked(state, "/case")).toBe(true);
    expect(getMissionForRoute(state, "/case")).toBe("source");
  });
});

describe("onboarding", () => {
  it("starts as not onboarded", () => {
    expect(initialProgressState.onboarded).toBeUndefined();
  });

  it("remembers sign-up so the account screen is not shown again", () => {
    const state = markOnboarded(initialProgressState);
    expect(state.onboarded).toBe(true);
    expect(markOnboarded(state)).toBe(state);
  });

  it("treats a player with a completed mission as already onboarded", () => {
    const restored = parseProgressState({ version: PROGRESS_VERSION, completedMissionIds: ["training"] });
    expect(restored.onboarded).toBe(true);
  });

  it("survives a reload", () => {
    const saved = markOnboarded(initialProgressState);
    expect(parseProgressState(JSON.parse(JSON.stringify(saved))).onboarded).toBe(true);
  });
});

describe("resetting progress", () => {
  it("returns to the initial state", () => {
    const played = completeMission(initialProgressState, "training", {
      missionId: "training",
      correctRounds: 1,
      totalRounds: 3
    });

    expect(resetProgressState()).toEqual(initialProgressState);
    expect(played.completedMissionIds).toEqual(["training"]);
  });
});
