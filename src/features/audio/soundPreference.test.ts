import { afterEach, describe, expect, it, vi } from "vitest";
import { readSoundEnabled, resetSoundStoreForTests, SOUND_STORAGE_KEY } from "./soundPreference";

afterEach(() => {
  vi.unstubAllGlobals();
  resetSoundStoreForTests();
});

describe("sound preference", () => {
  it("is disabled by default and only accepts the existing enabled value", () => {
    expect(readSoundEnabled()).toBe(false);
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value)
      }
    });
    values.set(SOUND_STORAGE_KEY, "on");
    expect(readSoundEnabled()).toBe(true);
    values.set(SOUND_STORAGE_KEY, "unexpected");
    expect(readSoundEnabled()).toBe(false);
  });
});
