import { afterEach, describe, expect, it, vi } from "vitest";
import { enableSoundForNewProfile, readSoundEnabled, resetSoundStoreForTests, SOUND_STORAGE_KEY } from "./soundPreference";

afterEach(() => {
  vi.unstubAllGlobals();
  resetSoundStoreForTests();
});

it("enables sound for a new profile only when the device has no explicit choice", () => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  expect(enableSoundForNewProfile()).toBe(true);
  expect(values.get(SOUND_STORAGE_KEY)).toBe("on");
  values.set(SOUND_STORAGE_KEY, "off");
  expect(enableSoundForNewProfile()).toBe(false);
  expect(values.get(SOUND_STORAGE_KEY)).toBe("off");
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
