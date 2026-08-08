/**
 * Recorded lines, when there are any.
 *
 * The device's own synthesiser reads everything by default. It works on any phone and
 * costs nothing to ship, but it sounds like a machine reading a form, which is a poor
 * welcome for a six-year-old being told a story by a rooster.
 *
 * So a line can also exist as an audio file, generated once and shipped with the game.
 * Where a file exists it is played; where it does not, the synthesiser still speaks. That
 * fallback is the whole design: a missing clip costs nothing, so the recordings can be
 * added a handful at a time instead of all at once.
 *
 * Lines are addressed by a hash of the text itself rather than by a message key. That
 * choice has one consequence worth stating plainly: **edit the text and the clip stops
 * matching, and the line quietly returns to the synthesiser** until it is generated again.
 * Better than the alternative, where a clip would keep confidently saying the old wording.
 */

/**
 * FNV-1a, 32 bits, as hex.
 *
 * A filename, not a security boundary: it has to be identical in the browser and in the
 * generator script, and it has to be synchronous so that deciding what to play does not
 * need an await. Collisions across a hundred short strings are not a real risk.
 */
export function hashLine(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Everything that has to match between what the browser asks for and what was generated. */
export function normalizeLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function getClipName(text: string): string {
  return hashLine(normalizeLine(text));
}

export function getClipUrl(locale: string, text: string): string {
  return `/audio/voice/${locale}/${getClipName(text)}.mp3`;
}

/**
 * The list of clips that were generated, shipped beside them.
 *
 * Asked before fetching so a missing recording is a lookup rather than a failed request.
 * That matters offline, where a 404 is slow and noisy, and it matters on the phones this
 * is built for, where every request costs something.
 */
export type ClipManifest = Record<string, string[]>;

export function hasClip(manifest: ClipManifest | null, locale: string, text: string): boolean {
  if (!manifest) return false;
  const names = manifest[locale];
  return Array.isArray(names) && names.includes(getClipName(text));
}

/**
 * Reads a manifest that came off the network, keeping only what is shaped correctly.
 *
 * A half-written or hand-edited file costs the recorded voice, never the game: anything
 * unrecognisable falls back to an empty catalogue, and the synthesiser carries on.
 */
export function parseClipManifest(raw: unknown): ClipManifest {
  if (typeof raw !== "object" || raw === null) return {};

  const parsed: ClipManifest = {};
  for (const [locale, names] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(names)) continue;
    parsed[locale] = names.filter((name): name is string => typeof name === "string");
  }
  return parsed;
}
