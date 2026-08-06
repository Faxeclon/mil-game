import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialProgressState } from "./progressState";
import { PROGRESS_STORAGE_KEY } from "./progressStorage";
import {
  completeLevelInStore,
  getProgressSnapshot,
  getServerProgressSnapshot,
  resetProgressInStore,
  resetProgressStoreForTests,
  subscribeToProgress
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
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetProgressStoreForTests();
});

describe("progress store", () => {
  it("renders the empty snapshot on the server", () => {
    expect(getServerProgressSnapshot()).toEqual({
      hydrated: false,
      state: initialProgressState
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
    expect(entries.has(PROGRESS_STORAGE_KEY)).toBe(true);
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

  it("clears storage and returns to the start on reset", () => {
    const entries = stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    completeLevelInStore("basics-1", attemptedLevel);

    resetProgressInStore();

    expect(entries.has(PROGRESS_STORAGE_KEY)).toBe(false);
    expect(getProgressSnapshot().state.completedLevelIds).toEqual([]);
    unsubscribe();
  });
});
