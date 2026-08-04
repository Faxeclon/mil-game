import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROGRESS_STORAGE_KEY } from "./progressStorage";
import {
  completeLevelInStore,
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
      state: { version: 1, completedLevelIds: [], localNickname: null, apprenticeAvatarId: null }
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

    completeLevelInStore("animals-1", { correctRounds: 3, totalRounds: 3 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getProgressSnapshot().state.completedLevelIds).toEqual(["animals-1"]);
    expect(getProgressSnapshot().state.lastResult).toEqual({
      levelId: "animals-1",
      correctRounds: 3,
      totalRounds: 3
    });
    expect(entries.has(PROGRESS_STORAGE_KEY)).toBe(true);
    unsubscribe();
  });

  it("does not notify again when the same level is completed twice", () => {
    stubStorage();
    const listener = vi.fn();
    const unsubscribe = subscribeToProgress(listener);
    completeLevelInStore("basics-1");
    listener.mockClear();

    completeLevelInStore("basics-1");

    expect(listener).not.toHaveBeenCalled();
    expect(getProgressSnapshot().state.completedLevelIds).toEqual(["basics-1"]);
    unsubscribe();
  });

  it("clears storage and returns to the start on reset", () => {
    const entries = stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    completeLevelInStore("basics-1");

    resetProgressInStore();

    expect(entries.has(PROGRESS_STORAGE_KEY)).toBe(false);
    expect(getProgressSnapshot().state.completedLevelIds).toEqual([]);
    unsubscribe();
  });
});
