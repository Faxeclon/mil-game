import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCESSIBILITY_STORAGE_KEY,
  readAccessibility,
  resetAccessibility,
  setAccessibility
} from "@/features/accessibility/accessibilityStore";
import { DEFAULT_ACCESSIBILITY } from "@/features/accessibility/accessibilitySettings";
import { readSoundEnabled, setSoundEnabled, SOUND_STORAGE_KEY } from "@/features/audio/soundPreference";
import { PROGRESS_STORAGE_KEY } from "@/features/progress/progressStorage";
import {
  completeLevel,
  initialProgressState,
  markOnboarded,
  resetProgressKeepingProfile
} from "@/features/progress/progressState";

/**
 * The border between the two resets.
 *
 * Settings has two buttons that sound alike, and the whole point is that each stops where
 * the other begins: starting the game over must not silence a child who needs the reader,
 * and putting the options back must not cost them a single medal.
 *
 * They live in separate storage keys and neither module imports the other, so today they
 * cannot collide. This is here so that stays true after somebody decides it would be
 * tidier to keep everything in one place.
 */
function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key)
    }
  });
  return store;
}

beforeEach(() => {
  stubStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** An attempt id has to be at least 16 characters, or the attempt is quietly discarded. */
const attempt = {
  attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
  correctRounds: 3,
  totalRounds: 3,
  elapsedMs: 8000,
  completedAt: "2026-08-08T10:00:00.000Z",
  score: 1000,
  playedOn: "2026-08-08"
};

describe("each reset keeps to its own side", () => {
  it("stores the two things in different places to begin with", () => {
    // If these ever coincide, one reset starts clearing the other's data by accident.
    const keys = [PROGRESS_STORAGE_KEY, ACCESSIBILITY_STORAGE_KEY, SOUND_STORAGE_KEY];

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("starting the game over leaves the accessibility choices alone", () => {
    setAccessibility({ ...DEFAULT_ACCESSIBILITY, readAloud: true, largerText: true });

    resetProgressKeepingProfile(completeLevel(markOnboarded(initialProgressState, "Roqui 47"), "basics-1", attempt));

    expect(readAccessibility()).toMatchObject({ readAloud: true, largerText: true });
  });

  it("starting the game over leaves the music as the child had it", () => {
    for (const wanted of [true, false]) {
      setSoundEnabled(wanted);

      resetProgressKeepingProfile(completeLevel(markOnboarded(initialProgressState, "Roqui 47"), "basics-1", attempt));

      expect(readSoundEnabled()).toBe(wanted);
    }
  });

  it("putting the options back does not touch a single mission or the name", () => {
    setAccessibility({ ...DEFAULT_ACCESSIBILITY, readAloud: true });
    const played = completeLevel(markOnboarded(initialProgressState, "Roqui 47", "fox"), "basics-1", attempt);
    const before = JSON.parse(JSON.stringify(played));

    resetAccessibility();

    // The progress object is not even reachable from there; this states it as a rule.
    expect(played).toEqual(before);
    expect(played.completedLevelIds).toEqual(["basics-1"]);
    expect(played.localNickname).toBe("Roqui 47");
  });

  it("putting the options back does not replay the map tour", () => {
    const played = { ...markOnboarded(initialProgressState, "Roqui 47"), mapOnboardingStage: "complete" as const };

    resetAccessibility();

    expect(played.mapOnboardingStage).toBe("complete");
  });

  it("puts the accessibility choices back to how a new game behaves", () => {
    setAccessibility({ ...DEFAULT_ACCESSIBILITY, readAloud: true, clearReading: true, reducedMotion: true });

    resetAccessibility();

    expect(readAccessibility()).toEqual(DEFAULT_ACCESSIBILITY);
  });
});
