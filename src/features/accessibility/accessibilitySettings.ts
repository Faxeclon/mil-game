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
