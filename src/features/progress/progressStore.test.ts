import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAvailableMissionId } from "./progressState";
import { PROGRESS_STORAGE_KEY } from "./progressStorage";
import {
  completeMissionInStore,
  getProgressSnapshot,
  getServerProgressSnapshot,
  resetProgressInStore,
  resetProgressStoreForTests,
  subscribeToProgress
} from "./progressStore";

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
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetProgressStoreForTests();
});

describe("progress store", () => {
  it("renders the empty snapshot on the server", () => {
    expect(getServerProgressSnapshot()).toEqual({
      hydrated: false,
      state: { version: 1, completedMissionIds: [], completedLevelIds: [] }
    });
  });

  it("loads the saved progress when the first subscriber arrives", () => {
    stubStorage({
      [PROGRESS_STORAGE_KEY]: JSON.stringify({ version: 1, completedMissionIds: ["training"] })
    });

    expect(getProgressSnapshot().hydrated).toBe(false);
    const unsubscribe = subscribeToProgress(() => {});

    expect(getProgressSnapshot().hydrated).toBe(true);
    expect(getProgressSnapshot().state.completedMissionIds).toEqual(["training"]);
    unsubscribe();
  });

  it("notifies subscribers and writes to storage when a mission is completed", () => {
    const entries = stubStorage();
    const listener = vi.fn();
    const unsubscribe = subscribeToProgress(listener);
    listener.mockClear();

    completeMissionInStore("training", { missionId: "training", correctRounds: 3, totalRounds: 3 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAvailableMissionId(getProgressSnapshot().state)).toBe("source");
    expect(entries.has(PROGRESS_STORAGE_KEY)).toBe(true);
    unsubscribe();
  });

  it("does not notify again when the same mission is completed twice", () => {
    stubStorage();
    const listener = vi.fn();
    const unsubscribe = subscribeToProgress(listener);
    completeMissionInStore("training");
    listener.mockClear();

    completeMissionInStore("training");

    expect(listener).not.toHaveBeenCalled();
    expect(getProgressSnapshot().state.completedMissionIds).toEqual(["training"]);
    unsubscribe();
  });

  it("clears storage and returns to the start on reset", () => {
    const entries = stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    completeMissionInStore("training");

    resetProgressInStore();

    expect(entries.has(PROGRESS_STORAGE_KEY)).toBe(false);
    expect(getProgressSnapshot().state.completedMissionIds).toEqual([]);
    expect(getAvailableMissionId(getProgressSnapshot().state)).toBe("training");
    unsubscribe();
  });
});
