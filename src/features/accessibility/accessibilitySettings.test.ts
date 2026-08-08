import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCESSIBILITY,
  parseAccessibility,
  PRESENTATION_KEYS,
  togglePresentation,
  type AccessibilitySettings
} from "./accessibilitySettings";

describe("presentation settings", () => {
  it("starts with every presentation help turned off", () => {
    expect(DEFAULT_ACCESSIBILITY).toEqual({
      readAloud: false,
      clearReading: false,
      reducedMotion: false,
      largerText: false
    });
  });

  it("keeps each presentation choice independent", () => {
    let settings = DEFAULT_ACCESSIBILITY;

    for (const key of PRESENTATION_KEYS) {
      settings = togglePresentation(settings, key);
    }

    expect(settings.readAloud).toBe(true);
    expect(settings.clearReading).toBe(true);
    expect(settings.reducedMotion).toBe(true);
    expect(settings.largerText).toBe(true);
  });
});

describe("reading what the device kept", () => {
  it("falls back to the default for anything that is not a settings record", () => {
    expect(parseAccessibility(null)).toEqual(DEFAULT_ACCESSIBILITY);
    expect(parseAccessibility("readAloud")).toEqual(DEFAULT_ACCESSIBILITY);
    expect(parseAccessibility(7)).toEqual(DEFAULT_ACCESSIBILITY);
  });

  it("keeps what it recognises and drops ruleset and unknown fields", () => {
    const parsed = parseAccessibility({
      readAloud: true,
      clearReading: "yes",
      ruleset: "ownPace",
      unknown: true
    });

    expect(parsed.readAloud).toBe(true);
    expect(parsed.clearReading).toBe(false);
    expect(parsed).not.toHaveProperty("ruleset");
    expect(parsed).not.toHaveProperty("unknown");
  });

  it("round-trips a full presentation record", () => {
    const settings: AccessibilitySettings = {
      readAloud: true,
      clearReading: true,
      reducedMotion: true,
      largerText: false
    };

    expect(parseAccessibility(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });
});
