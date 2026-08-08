/**
 * Collects the lines worth recording, and names each one the way the game will ask for it.
 *
 * Run: node scripts/collect-voice-lines.mjs
 * Writes: scripts/voice-lines.json
 *
 * Only fixed wording is collected. A line with a placeholder in it - a nickname, a score,
 * how many missions are left - is different every time it is said, so no recording could
 * match it; those stay with the device synthesiser and are skipped here.
 *
 * The name of each line is a hash of the line itself, computed exactly as the browser
 * computes it. That is what lets a recording be found without a lookup table, and it is
 * also why editing a line means regenerating it: the name changes with the words.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = join(here, "..", "src", "messages");
const LOCALES = ["es", "en"];

/** Must stay identical to `hashLine` in src/features/speech/clipCatalog.ts. */
function hashLine(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

const normalize = (text) => text.replace(/\s+/g, " ").trim();

/**
 * Exactly what the narrator is given, and nothing else.
 *
 * Written out by hand rather than swept up by namespace. Sweeping produced seven hundred
 * lines, most of them button labels and screen-reader hints the narrator never receives -
 * a download nobody would hear. Every path below matches a `<Narrator lines={...}>` in the
 * app, so the recordings and the reading stay the same set.
 *
 * When a screen starts narrating something new, add its path here.
 */
const SPOKEN_PATHS = [
  // Roqui's introduction, and the profile screen a child meets before playing anything.
  "home.dialogue",
  "home.profileTitle",
  "home.profileAvatar",
  "home.profileNicknameLabel",
  "home.profileNicknameHint",
  "home.profileCompletionTitle",
  "home.hubGreeting",
  "home.hubAllDone",
  // The mission briefing and everything said during a round.
  "education",
  "tutorial",
  // The map, the islands, and how a mission ended.
  "worlds.title",
  "worlds.available",
  "worlds.completed",
  "worlds.comingSoon",
  "worlds.lockedIsland",
  "islands.islandTitle",
  "islands.list",
  "islands.islandEmpty",
  "results.title",
  "results.description",
  "results.newRecord",
  "results.scoreUnavailable",
  // The smaller screens the narrator also reaches.
  "rank.ladderTitle",
  "rank.howItWorks",
  "friends.title",
  "friends.lead",
  "settings.title",
  "settings.lead"
];

function atPath(messages, path) {
  return path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), messages);
}

/** A line with a placeholder is different every time, so it can never be pre-recorded. */
const hasPlaceholder = (text) => /\{[^}]+\}/.test(text);

/** Buttons, chips and single words are read badly out of context and add little. */
const isWorthRecording = (text) => normalize(text).length >= 12 && !hasPlaceholder(text);

function collect(value, into) {
  if (typeof value === "string") {
    if (isWorthRecording(value)) into.add(normalize(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collect(item, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collect(item, into);
  }
}

const output = {};
let total = 0;

for (const locale of LOCALES) {
  const messages = JSON.parse(await readFile(join(messagesDir, `${locale}.json`), "utf8"));
  const lines = new Set();

  for (const path of SPOKEN_PATHS) {
    const value = atPath(messages, path);
    if (value === undefined) {
      console.warn(`  ! ${locale}: nothing at "${path}"`);
      continue;
    }
    collect(value, lines);
  }

  output[locale] = [...lines]
    .sort()
    .map((text) => ({ name: hashLine(text), text }));
  total += output[locale].length;
  console.log(`${locale}: ${output[locale].length} lines`);
}

await writeFile(join(here, "voice-lines.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`\n${total} lines in total -> scripts/voice-lines.json`);
