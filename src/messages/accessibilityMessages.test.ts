import { describe, expect, it } from "vitest";
import {
  ACCESSIBILITY_PRESET_KEYS,
  PRESENTATION_KEYS
} from "@/features/accessibility/accessibilitySettings";
import en from "./en.json";
import es from "./es.json";

const LOCALES = { es, en } as const;

/**
 * A missing key does not fail the build, it renders as the key itself in front of a
 * child. These tests are the only thing standing between a translation gap and
 * "accessModes.ownPacePresetFor" printed on the settings screen.
 */
describe.each(Object.entries(LOCALES))("%s messages", (_locale, messages) => {
  const modes = messages.accessModes as Record<string, string>;
  const settings = messages.settings as Record<string, string>;

  it("names and describes every presentation switch", () => {
    for (const key of PRESENTATION_KEYS) {
      expect(modes[`${key}Name`]).toBeTruthy();
      expect(modes[`${key}Detail`]).toBeTruthy();
    }
  });

  /*
   * The description is what tells a child who each bundle was built for. Without it the
   * card is a name with no explanation, which is exactly what we set out to avoid.
   */
  it("names, describes and says who each bundle is for", () => {
    for (const key of ACCESSIBILITY_PRESET_KEYS) {
      expect(modes[`${key}PresetName`]).toBeTruthy();
      expect(modes[`${key}PresetFor`]).toBeTruthy();
      expect(modes[`${key}PresetDetail`]).toBeTruthy();
    }
  });

  it("labels the gear that opens the individual switches", () => {
    expect(modes.customise).toBeTruthy();
    expect(modes.switchesTitle).toBeTruthy();
    expect(modes.switchesLead).toBeTruthy();
  });

  it("carries both kinds of reset, with their own confirmation", () => {
    expect(settings.resetProgressName).toBeTruthy();
    expect(settings.resetProgressDetail).toBeTruthy();
    expect(settings.resetSettingsName).toBeTruthy();
    expect(settings.resetSettingsDetail).toBeTruthy();
    expect(settings.resetSettingsConfirm).toBeTruthy();
    expect(settings.resetSettingsYes).toBeTruthy();
  });

  /*
   * The two buttons sit next to each other and only the words tell them apart. If they
   * ever read the same, a child loses every medal reaching for the harmless one.
   */
  it("keeps the two resets from reading alike", () => {
    expect(settings.resetProgressName).not.toBe(settings.resetSettingsName);
    expect(settings.resetProgressDetail).not.toBe(settings.resetSettingsDetail);
  });
});

describe("both languages", () => {
  it("carry exactly the same accessibility keys", () => {
    expect(Object.keys(es.accessModes).sort()).toEqual(Object.keys(en.accessModes).sort());
    expect(Object.keys(es.settings).sort()).toEqual(Object.keys(en.settings).sort());
  });
});
