import { afterEach, describe, expect, it, vi } from "vitest";
import { completeLevel, initialProgressState, markOnboarded } from "./progressState";
import {
  clearProgressState,
  PROGRESS_STORAGE_KEY,
  readProgressState,
  writeProgressState
} from "./progressStorage";

/** Minimal in-memory stand-in for localStorage. */
function createStorage(initialEntries: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initialEntries));
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
    entries
  };
}

function withWindow(storage: unknown) {
  vi.stubGlobal("window", { localStorage: storage });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("progress storage", () => {
  it("returns the initial state during server rendering, without touching window", () => {
    expect(typeof window).toBe("undefined");
    expect(readProgressState()).toEqual(initialProgressState);
    expect(() => writeProgressState(initialProgressState)).not.toThrow();
    expect(() => clearProgressState()).not.toThrow();
  });

  it("persists progress under a versioned key and reads it back", () => {
    const storage = createStorage();
    withWindow(storage);

    const played = completeLevel(initialProgressState, "basics-2", {
      correctRounds: 2,
      totalRounds: 3
    });
    writeProgressState(played);

    expect(storage.entries.has(PROGRESS_STORAGE_KEY)).toBe(true);
    expect(readProgressState().completedLevelIds).toEqual(["basics-2"]);
    expect(readProgressState().lastResult).toEqual({
      levelId: "basics-2",
      correctRounds: 2,
      totalRounds: 3
    });
  });

  it("starts clean when the stored value is not valid JSON", () => {
    withWindow(createStorage({ [PROGRESS_STORAGE_KEY]: "{not json" }));
    expect(readProgressState()).toEqual(initialProgressState);
  });

  it("starts clean when nothing was ever stored", () => {
    withWindow(createStorage());
    expect(readProgressState()).toEqual(initialProgressState);
  });

  it("removes the stored progress on reset", () => {
    const storage = createStorage();
    withWindow(storage);

    writeProgressState(completeLevel(initialProgressState, "basics-1"));
    clearProgressState();

    expect(storage.entries.has(PROGRESS_STORAGE_KEY)).toBe(false);
    expect(readProgressState()).toEqual(initialProgressState);
  });

  it("keeps playing when storage itself throws", () => {
    withWindow({
      getItem: () => {
        throw new Error("storage disabled");
      },
      setItem: () => {
        throw new Error("storage disabled");
      },
      removeItem: () => {
        throw new Error("storage disabled");
      }
    });

    expect(readProgressState()).toEqual(initialProgressState);
    expect(() => writeProgressState(initialProgressState)).not.toThrow();
    expect(() => clearProgressState()).not.toThrow();
  });

  it("uses one key for both languages, so switching locale keeps the progress", () => {
    const storage = createStorage();
    withWindow(storage);

    writeProgressState(completeLevel(initialProgressState, "basics-1"));

    // A locale change re-mounts the app but reads the very same key.
    expect([...storage.entries.keys()]).toEqual([PROGRESS_STORAGE_KEY]);
    expect(readProgressState().completedLevelIds).toEqual(["basics-1"]);
  });

  it("keeps onboarding, a valid player name, and the selected apprentice across a storage round trip", () => {
    const storage = createStorage();
    withWindow(storage);

    writeProgressState(markOnboarded(initialProgressState, "Detective Eagle", "fox"));

    expect(readProgressState()).toMatchObject({
      onboarded: true,
      playerName: "Detective Eagle",
      apprenticeAvatarId: "fox"
    });
  });
});
