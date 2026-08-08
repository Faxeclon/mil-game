import { describe, expect, it } from "vitest";
import {
  allowsCountdown,
  asksForClue,
  DEFAULT_ACCESSIBILITY,
  parseAccessibility,
  PRESENTATION_KEYS,
  selectRuleset,
  togglePresentation,
  type AccessibilitySettings
} from "./accessibilitySettings";

describe("the two axes", () => {
  it("starts on the standard ruleset with no presentation help turned on", () => {
    expect(DEFAULT_ACCESSIBILITY).toEqual({
      readAloud: false,
      clearReading: false,
      reducedMotion: false,
      largerText: false,
      ruleset: "challenge"
    });
  });

  /*
   * The whole reason the two axes exist. A child who needs to hear the question is
   * answering the same question as everyone else, so turning the voice on must leave the
   * rules — and therefore the score — exactly where they were.
   */
  it("never lets a presentation choice change the ruleset", () => {
    let settings = DEFAULT_ACCESSIBILITY;

    for (const key of PRESENTATION_KEYS) {
      settings = togglePresentation(settings, key);
      expect(settings.ruleset).toBe(DEFAULT_ACCESSIBILITY.ruleset);
      expect(allowsCountdown(settings)).toBe(true);
      expect(asksForClue(settings)).toBe(false);
    }

    expect(settings.readAloud).toBe(true);
    expect(settings.clearReading).toBe(true);
  });

  it("never lets the ruleset change a presentation choice", () => {
    const helped = togglePresentation(
      togglePresentation(DEFAULT_ACCESSIBILITY, "readAloud"),
      "clearReading"
    );
    const switched = selectRuleset(helped, "ownPace");

    expect(switched.readAloud).toBe(true);
    expect(switched.clearReading).toBe(true);
  });

  it("puts the clock and the clue question on opposite rulesets", () => {
    const challenge = selectRuleset(DEFAULT_ACCESSIBILITY, "challenge");
    const ownPace = selectRuleset(DEFAULT_ACCESSIBILITY, "ownPace");

    expect(allowsCountdown(challenge)).toBe(true);
    expect(asksForClue(challenge)).toBe(false);

    expect(allowsCountdown(ownPace)).toBe(false);
    expect(asksForClue(ownPace)).toBe(true);
  });

  it("lets the voice be on while playing the timed ruleset", () => {
    const settings = togglePresentation(
      selectRuleset(DEFAULT_ACCESSIBILITY, "challenge"),
      "readAloud"
    );

    expect(settings.readAloud).toBe(true);
    expect(allowsCountdown(settings)).toBe(true);
  });
});

describe("reading what the device kept", () => {
  it("falls back to the default for anything that is not a settings record", () => {
    expect(parseAccessibility(null)).toEqual(DEFAULT_ACCESSIBILITY);
    expect(parseAccessibility("readAloud")).toEqual(DEFAULT_ACCESSIBILITY);
    expect(parseAccessibility(7)).toEqual(DEFAULT_ACCESSIBILITY);
  });

  it("keeps what it recognises and defaults the rest", () => {
    const parsed = parseAccessibility({
      readAloud: true,
      clearReading: "yes",
      ruleset: "sideways",
      unknown: true
    });

    expect(parsed.readAloud).toBe(true);
    expect(parsed.clearReading).toBe(false);
    expect(parsed.ruleset).toBe(DEFAULT_ACCESSIBILITY.ruleset);
    expect(parsed).not.toHaveProperty("unknown");
  });

  it("round-trips a full settings record", () => {
    const settings: AccessibilitySettings = {
      readAloud: true,
      clearReading: true,
      reducedMotion: true,
      largerText: false,
      ruleset: "ownPace"
    };

    expect(parseAccessibility(JSON.parse(JSON.stringify(settings)))).toEqual(settings);
  });
});
