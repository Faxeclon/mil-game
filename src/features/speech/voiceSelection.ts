/**
 * Choosing which installed voice reads the game out loud.
 *
 * The device decides what is available, and on the phones this game is built for the
 * answer is often "not much": a cheap Android with no data left may ship with an English
 * voice and nothing else. Reading Spanish text with an English voice produces something a
 * child cannot follow, which is worse than staying silent, so a wrong-language voice is
 * treated as no voice at all.
 */

export type InstalledVoice = {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
};

/** `es-PE`, `es_PE` and `es` all count as Spanish. */
function languageOf(tag: string): string {
  return tag.toLowerCase().replace("_", "-").split("-")[0] ?? "";
}

export function speaksLanguage(voice: InstalledVoice, locale: string): boolean {
  return languageOf(voice.lang) === languageOf(locale);
}

/**
 * Picks the best voice for a locale, or `null` when the device has none in that language.
 *
 * Local voices win over network ones: a voice that needs a server is no voice at all on
 * the bus home with no signal, which is exactly when this game is meant to work.
 */
export function pickVoice(voices: InstalledVoice[], locale: string): InstalledVoice | null {
  const matching = voices.filter((voice) => speaksLanguage(voice, locale));
  if (matching.length === 0) return null;

  const regional = matching.filter(
    (voice) => voice.lang.toLowerCase().replace("_", "-") === locale.toLowerCase()
  );
  const preferred = regional.length > 0 ? regional : matching;

  return (
    preferred.find((voice) => voice.localService && voice.default) ??
    preferred.find((voice) => voice.localService) ??
    preferred.find((voice) => voice.default) ??
    preferred[0] ??
    null
  );
}

/**
 * What is left to read once the decorations are removed.
 *
 * Interface strings carry separators and emoji that a synthesiser reads out loud one
 * symbol at a time. Nothing that carries meaning is dropped; only what would be heard as
 * noise.
 */
export function toSpokenText(raw: string): string {
  return raw
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, " ")
    .replace(/\s*[·•|]+\s*/g, ". ")
    .replace(/\s*\.\s*\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nothing to say means the button should not offer to say it. */
export function isWorthSpeaking(raw: string): boolean {
  return toSpokenText(raw).length > 0;
}
