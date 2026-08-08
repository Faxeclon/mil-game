import { describe, expect, it } from "vitest";
import {
  ACCESSIBILITY_PRESET_KEYS,
  ACCESSIBILITY_PRESETS,
  DEFAULT_ACCESSIBILITY,
  isCustom,
  isPresetActive,
  parseAccessibility,
  PRESENTATION_KEYS,
  resetPresentation,
  togglePreset,
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

describe("the two bundles", () => {
  it("starts with neither bundle on", () => {
    expect(isPresetActive(DEFAULT_ACCESSIBILITY, "ownPace")).toBe(false);
    expect(isPresetActive(DEFAULT_ACCESSIBILITY, "clearReading")).toBe(false);
  });

  it("turns on every switch its bundle owns and leaves the rest alone", () => {
    const next = togglePreset(DEFAULT_ACCESSIBILITY, "ownPace");

    expect(next.readAloud).toBe(true);
    expect(next.reducedMotion).toBe(true);
    expect(next.clearReading).toBe(DEFAULT_ACCESSIBILITY.clearReading);
    expect(next.largerText).toBe(DEFAULT_ACCESSIBILITY.largerText);
    expect(isPresetActive(next, "ownPace")).toBe(true);
  });

  it("turns everything off when the bundle already on is tapped again", () => {
    const on = togglePreset(DEFAULT_ACCESSIBILITY, "clearReading");

    expect(togglePreset(on, "clearReading")).toEqual(DEFAULT_ACCESSIBILITY);
  });

  it("replaces rather than merges, so a tap always produces what the card says", () => {
    const ownPace = togglePreset(DEFAULT_ACCESSIBILITY, "ownPace");
    const swapped = togglePreset(ownPace, "clearReading");

    expect(isPresetActive(swapped, "clearReading")).toBe(true);
    expect(isPresetActive(swapped, "ownPace")).toBe(false);
    expect(swapped.reducedMotion).toBe(false);
  });

  it("stops calling a bundle active once one of its switches is flipped by hand", () => {
    const on = togglePreset(DEFAULT_ACCESSIBILITY, "ownPace");

    expect(isPresetActive(togglePresentation(on, "reducedMotion"), "ownPace")).toBe(false);
  });

  /*
   * The bug this replaced: turning on one extra switch left the card still lit, so it
   * claimed a bundle the game was no longer running.
   */
  it("stops calling a bundle active once an unrelated switch is turned on", () => {
    const on = togglePreset(DEFAULT_ACCESSIBILITY, "ownPace");

    expect(isPresetActive(togglePresentation(on, "largerText"), "ownPace")).toBe(false);
  });
});

describe("the custom state", () => {
  it("is not custom when nothing is on", () => {
    expect(isCustom(DEFAULT_ACCESSIBILITY)).toBe(false);
  });

  it("is not custom while a bundle is exactly what is set", () => {
    for (const preset of ACCESSIBILITY_PRESET_KEYS) {
      expect(isCustom(togglePreset(DEFAULT_ACCESSIBILITY, preset))).toBe(false);
    }
  });

  it("is custom once the child adds something a bundle does not include", () => {
    const edited = togglePresentation(togglePreset(DEFAULT_ACCESSIBILITY, "ownPace"), "largerText");

    expect(isCustom(edited)).toBe(true);
  });

  it("is custom when a bundle is missing one of its own switches", () => {
    const edited = togglePresentation(togglePreset(DEFAULT_ACCESSIBILITY, "ownPace"), "readAloud");

    expect(isCustom(edited)).toBe(true);
  });

  /* Both bundles at once is a real thing to want; it simply has no card of its own. */
  it("is custom when both bundles are switched on together", () => {
    const both = { ...DEFAULT_ACCESSIBILITY, readAloud: true, reducedMotion: true, clearReading: true, largerText: true };

    expect(isCustom(both)).toBe(true);
    for (const preset of ACCESSIBILITY_PRESET_KEYS) {
      expect(isPresetActive(both, preset)).toBe(false);
    }
  });

  it("never lets a bundle exist without the voice", () => {
    for (const preset of Object.values(ACCESSIBILITY_PRESETS)) {
      expect(preset.readAloud).toBe(true);
    }
  });
});

describe("resetting the settings", () => {
  /*
   * The button is called "reset", so it may only ever put things back. Turning anything
   * on — music included — would make it an action that starts something nobody asked for.
   */
  it("returns every switch to how a freshly installed game behaves", () => {
    const used: AccessibilitySettings = {
      readAloud: true,
      clearReading: true,
      reducedMotion: true,
      largerText: true
    };

    expect(resetPresentation()).toEqual(DEFAULT_ACCESSIBILITY);
    expect(resetPresentation()).not.toEqual(used);
    for (const key of PRESENTATION_KEYS) {
      expect(resetPresentation()[key]).toBe(false);
    }
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
