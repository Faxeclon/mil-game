import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import type { TutorialPack } from "@/content/schemas/tutorial";
import { validateTutorialPack } from "@/content/validators/validateTutorialPack";
import animalsCompareJson from "./animals-compare.json";
import animalsTimedJson from "./animals-timed.json";
import cityBasicsTimedJson from "./city-basics-timed.json";
import sportsCompareJson from "./sports-compare.json";
import tutorialPackJson from "./introductory-tutorial.json";

function hasNestedKey(messages: object, key: string): boolean {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

/** A key only counts as authored when both languages have it, so neither can fall behind. */
function hasTutorialLocalizationKey(key: string): boolean {
  return hasNestedKey(spanishMessages.tutorial, key) && hasNestedKey(englishMessages.tutorial, key);
}

function load(pack: unknown): TutorialPack {
  return validateTutorialPack(pack, hasTutorialLocalizationKey);
}

/**
 * Every authored pack, keyed by the id missions refer to.
 *
 * A mission names its pack in the level blueprint and the registry hands it over; that
 * is what lets two missions of the same theme play different rounds. Adding content means
 * adding a JSON file and one entry here: no screen and no component changes.
 */
export const contentPacks: Readonly<Record<string, TutorialPack>> = {
  "introductory-tutorial-v1": load(tutorialPackJson),
  "city-basics-timed-v1": load(cityBasicsTimedJson),
  "animals-compare-v1": load(animalsCompareJson),
  "animals-timed-v1": load(animalsTimedJson),
  "sports-compare-v1": load(sportsCompareJson)
};

export function getContentPack(packId: string | undefined): TutorialPack | undefined {
  return packId ? contentPacks[packId] : undefined;
}

/** The pack every player meets first; the tutorial route has no mission to ask. */
export const introductoryTutorialPack = contentPacks["introductory-tutorial-v1"];
