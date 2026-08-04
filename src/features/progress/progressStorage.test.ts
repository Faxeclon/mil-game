import { afterEach, describe, expect, it, vi } from "vitest";
import { completeLevel, initialProgressState, markOnboarded } from "./progressState";
import {
  clearProgressState,
  PROGRESS_STORAGE_KEY,
  readProgressState,
  writeProgressState
} from "./progressStorage";

const attemptedLevel = {
  attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
  correctRounds: 0,
  totalRounds: 1,
  elapsedMs: 0,
  completedAt: "2025-01-02T03:04:05.000Z"
};

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
      totalRounds: 3,
      attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
      elapsedMs: 1_234,
      completedAt: "2025-01-02T03:04:05.000Z"
    });
    writeProgressState(played);

    expect(storage.entries.has(PROGRESS_STORAGE_KEY)).toBe(true);
    expect(readProgressState().completedLevelIds).toEqual(["basics-2"]);
    expect(readProgressState().lastResult).toEqual({
      levelId: "basics-2",
      correctRounds: 2,
      totalRounds: 3,
      attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
      elapsedMs: 1_234,
      completedAt: "2025-01-02T03:04:05.000Z"
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

    writeProgressState(completeLevel(initialProgressState, "basics-1", attemptedLevel));
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

    writeProgressState(completeLevel(initialProgressState, "basics-1", attemptedLevel));

    // A locale change re-mounts the app but reads the very same key.
    expect([...storage.entries.keys()]).toEqual([PROGRESS_STORAGE_KEY]);
    expect(readProgressState().completedLevelIds).toEqual(["basics-1"]);
  });

  it("keeps onboarding, a local nickname, and the selected apprentice across a storage round trip", () => {
    const storage = createStorage();
    withWindow(storage);

    writeProgressState(markOnboarded(initialProgressState, "Detective Eagle", "fox"));

    expect(readProgressState()).toMatchObject({
      onboarded: true,
      localNickname: "Detective Eagle",
      apprenticeAvatarId: "fox"
    });
  });

  it("rewrites a migrated legacy playerName as the canonical localNickname", () => {
    const storage = createStorage({
      [PROGRESS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        playerName: "Faxe",
        completedLevelIds: ["animals-1"],
        onboarded: true,
        apprenticeAvatarId: "cat",
        lastResult: { levelId: "animals-1", correctRounds: 2, totalRounds: 3 }
      })
    });
    withWindow(storage);

    const migrated = readProgressState();
    writeProgressState(migrated);
    const saved = JSON.parse(storage.entries.get(PROGRESS_STORAGE_KEY) ?? "{}");

    expect(migrated).toMatchObject({
      localNickname: "Faxe",
      completedLevelIds: ["animals-1"],
      onboarded: true,
      apprenticeAvatarId: "cat",
      lastResult: { levelId: "animals-1", correctRounds: 2, totalRounds: 3 }
    });
    expect(saved).toMatchObject({ localNickname: "Faxe", apprenticeAvatarId: "cat" });
    expect("playerName" in saved).toBe(false);
  });
});
