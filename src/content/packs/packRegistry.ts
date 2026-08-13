import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import type { ProvenanceMetadata, SinglePack, TutorialPack } from "@/content/schemas/tutorial";
import { validateSinglePack } from "@/content/validators/validateSinglePack";
import { validateTutorialPack } from "@/content/validators/validateTutorialPack";
import animalsCompareJson from "./animals-compare.json";
import animalsSingleJson from "./animals-single.json";
import creatorsSingleJson from "./creators-single.json";
import creatorsUncertainJson from "./creators-uncertain.json";
import memesSingleJson from "./memes-single.json";
import memesUncertainJson from "./memes-uncertain.json";
import sportsSingleJson from "./sports-single.json";
import animalsTimedJson from "./animals-timed.json";
import cityBasicsTimedJson from "./city-basics-timed.json";
import clipsCompareJson from "./clips-compare.json";
import clipsSingleJson from "./clips-single.json";
import sportsCompareJson from "./sports-compare.json";
import tutorialPackJson from "./introductory-tutorial.json";

/**
 * Final media deliberately held in reserve, rather than assigned to a playable round.
 * Keeping its provenance beside the pack registry makes the record available to future
 * content selection without changing the active level data.
 */
export const reserveMediaProvenance = {
  "/media/tutorial/animals/animals-2/reserve/raccoon-ai.jpg": {
    sourceType: "project-generated",
    sourceName: "Kikiria project team",
    licenseStatus: "Rights status not documented",
    generationMethod: "AI-generated for Kikiria",
    temporary: false
  },
  "/media/tutorial/animals/animals-2/reserve/raccoon-real.jpg": {
    sourceType: "external-unverified",
    sourceName: "External source not yet documented",
    licenseStatus: "Rights status unresolved",
    temporary: false
  }
} as const satisfies Readonly<Record<string, ProvenanceMetadata>>;

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
  "sports-compare-v1": load(sportsCompareJson),
  "clips-compare-v1": load(clipsCompareJson)
};

export function getContentPack(packId: string | undefined): TutorialPack | undefined {
  return packId ? contentPacks[packId] : undefined;
}

/**
 * Packs for the single-image mode. They are kept in their own registry because the shape
 * differs: one picture and two answers, rather than two pictures and one question.
 */
export const singlePacks: Readonly<Record<string, SinglePack>> = {
  "animals-single-v1": validateSinglePack(animalsSingleJson, hasTutorialLocalizationKey),
  "sports-single-v1": validateSinglePack(sportsSingleJson, hasTutorialLocalizationKey),
  "creators-uncertain-v1": validateSinglePack(creatorsUncertainJson, hasTutorialLocalizationKey),
  "creators-single-v1": validateSinglePack(creatorsSingleJson, hasTutorialLocalizationKey),
  "memes-uncertain-v1": validateSinglePack(memesUncertainJson, hasTutorialLocalizationKey),
  "memes-single-v1": validateSinglePack(memesSingleJson, hasTutorialLocalizationKey),
  "clips-single-v1": validateSinglePack(clipsSingleJson, hasTutorialLocalizationKey)
};

export function getSinglePack(packId: string | undefined): SinglePack | undefined {
  return packId ? singlePacks[packId] : undefined;
}

/** True when some authored pack, of either shape, answers to this id. */
export function hasContentPack(packId: string | undefined): boolean {
  return Boolean(getContentPack(packId) ?? getSinglePack(packId));
}

export type CreditedMedia = { packId: string; media: { id: string; provenance: ProvenanceMetadata } };

/** Only audited assets are exposed publicly; this neutral list deliberately has no answer or side data. */
export function getCreditedMedia(): CreditedMedia[] {
  return Object.entries(contentPacks).flatMap(([packId, pack]) =>
    pack.rounds.flatMap((round) =>
      round.choices
        .map((choice) => choice.media)
        .filter((media) => media.provenance.credit)
        .map((media) => ({ packId, media }))
    )
  );
}

/** The pack every player meets first; the tutorial route has no mission to ask. */
export const introductoryTutorialPack = contentPacks["introductory-tutorial-v1"];
