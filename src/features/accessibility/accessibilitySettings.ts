/**
 * **How the game is presented** — the voice, the spacing, the stillness — never changes a
 * score. A child who needs to hear the question is answering the same question as
 * everyone else, so making them play for a separate record would be a penalty for a
 * reading difficulty, which is the opposite of the point.
 *
 * Nothing here is named after a diagnosis. A child does not have to declare anything to
 * reach the setting that helps them, and most of the children this is built for have
 * never been assessed for anything in the first place.
 */

/** Presentation. None of these may ever affect scoring, stars or unlocking. */
export type PresentationSettings = {
  /** Enables an on-demand prompt reader where a compatible mission provides one. */
  readAloud: boolean;
  /**
   * Everything that makes text easier to follow, moved together: size, letter spacing,
   * word spacing, line height, line width, left alignment.
   *
   * It is one switch rather than six because widening the space between letters without
   * widening the space between words makes reading *worse*, and a child should not be
   * able to arrive at that combination by flipping switches in the wrong order.
   */
  clearReading: boolean;
  /** Nothing decorative moves. */
  reducedMotion: boolean;
  /** Size on its own, for someone who wants only that. */
  largerText: boolean;
};

export type AccessibilitySettings = PresentationSettings;

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  readAloud: false,
  clearReading: false,
  reducedMotion: false,
  largerText: false
};

export const PRESENTATION_KEYS = [
  "readAloud",
  "clearReading",
  "reducedMotion",
  "largerText"
] as const satisfies ReadonlyArray<keyof PresentationSettings>;

export function togglePresentation(
  settings: AccessibilitySettings,
  key: keyof PresentationSettings
): AccessibilitySettings {
  return { ...settings, [key]: !settings[key] };
}

/**
 * The two bundles offered as a single tap, so nobody has to work out which of four
 * switches their situation calls for.
 *
 * The names say what they do; the descriptions beside them say who they were built for.
 * That way a child never has to claim a diagnosis to reach the help, and a teacher
 * scanning the screen before class can still find what they are looking for.
 *
 * `readAloud` belongs to both on purpose: reading aloud is the only support with measured
 * benefit for either group, so neither bundle is allowed to leave it out.
 */
export const ACCESSIBILITY_PRESETS = {
  ownPace: { readAloud: true, reducedMotion: true },
  clearReading: { readAloud: true, clearReading: true, largerText: true }
} as const satisfies Record<string, Partial<PresentationSettings>>;

export type AccessibilityPresetKey = keyof typeof ACCESSIBILITY_PRESETS;

export const ACCESSIBILITY_PRESET_KEYS = Object.keys(
  ACCESSIBILITY_PRESETS
) as AccessibilityPresetKey[];

function entriesOf(preset: AccessibilityPresetKey): Array<[keyof PresentationSettings, boolean]> {
  return Object.entries(ACCESSIBILITY_PRESETS[preset]) as Array<
    [keyof PresentationSettings, boolean]
  >;
}

/** Exactly the switches this bundle turns on, and nothing else. */
export function presetSettings(preset: AccessibilityPresetKey): AccessibilitySettings {
  const settings = { ...DEFAULT_ACCESSIBILITY };
  for (const [key, value] of entriesOf(preset)) settings[key] = value;
  return settings;
}

/**
 * A bundle is on only when the settings are *exactly* what it sets — every switch it owns
 * turned on, and every switch it does not own left off.
 *
 * The looser reading, "its own switches are on", was wrong in a way that showed: turn on
 * one extra thing in the dialog and the card kept claiming to be active, while the game no
 * longer behaved like that bundle. A card that says "at my pace" has to mean it.
 *
 * Derived rather than stored, so a switch flipped by hand can never leave the card and the
 * game disagreeing.
 */
export function isPresetActive(
  settings: AccessibilitySettings,
  preset: AccessibilityPresetKey
): boolean {
  const wanted = presetSettings(preset);
  return PRESENTATION_KEYS.every((key) => settings[key] === wanted[key]);
}

/**
 * Anything switched on that matches neither bundle. This is the third state the screen has
 * to be able to show: not off, not one of the two, but the child's own combination.
 */
export function isCustom(settings: AccessibilitySettings): boolean {
  if (PRESENTATION_KEYS.every((key) => settings[key] === DEFAULT_ACCESSIBILITY[key])) return false;
  return !ACCESSIBILITY_PRESET_KEYS.some((preset) => isPresetActive(settings, preset));
}

/**
 * Tapping a bundle sets exactly that bundle; tapping the one already on clears everything.
 *
 * It replaces rather than merges so that pressing a card always produces the state the
 * card describes. Merging meant a tap could leave you in a combination no card named, with
 * nothing on screen lit up to explain why.
 *
 * Someone who wants both bundles at once still can, through the dialog — the screen then
 * says "custom", which is the truth.
 */
export function togglePreset(
  settings: AccessibilitySettings,
  preset: AccessibilityPresetKey
): AccessibilitySettings {
  return isPresetActive(settings, preset) ? { ...DEFAULT_ACCESSIBILITY } : presetSettings(preset);
}

/** Everything back to how a freshly installed game behaves. Progress is not touched. */
export function resetPresentation(): AccessibilitySettings {
  return { ...DEFAULT_ACCESSIBILITY };
}

/**
 * Reads whatever was on the device, keeping only what is recognisable.
 *
 * Anything missing, misspelled or of the wrong type falls back to the default instead of
 * throwing, so a half-written record from an interrupted save costs a setting, never the
 * game.
 */
export function parseAccessibility(raw: unknown): AccessibilitySettings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_ACCESSIBILITY };

  const record = raw as Record<string, unknown>;
  const parsed = { ...DEFAULT_ACCESSIBILITY };

  for (const key of PRESENTATION_KEYS) {
    if (typeof record[key] === "boolean") parsed[key] = record[key];
  }
  return parsed;
}
