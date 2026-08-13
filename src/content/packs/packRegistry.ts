import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import type { ProvenanceMetadata, SinglePack, TutorialPack } from "@/content/schemas/tutorial";
import { validateDecisionPack, type DecisionPack } from "@/content/schemas/decision";
import decisionInfluenceJson from "./decision-influence.json";
import decisionLimitsJson from "./decision-limits.json";
import decisionShareJson from "./decision-share.json";
import decisionSourceJson from "./decision-source.json";
import { validateSinglePack } from "@/content/validators/validateSinglePack";
import { validateTutorialPack } from "@/content/validators/validateTutorialPack";
import animalsCompareJson from "./animals-compare.json";
import animalsSingleJson from "./animals-single.json";
import sportsSingleJson from "./sports-single.json";
import animalsTimedJson from "./animals-timed.json";
import cityBasicsTimedJson from "./city-basics-timed.json";
import clipsSingleJson from "./clips-single.json";
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

/**
 * Packs for the single-image mode. They are kept in their own registry because the shape
 * differs: one picture and two answers, rather than two pictures and one question.
 */
export const singlePacks: Readonly<Record<string, SinglePack>> = {
  "animals-single-v1": validateSinglePack(animalsSingleJson, hasTutorialLocalizationKey),
  "sports-single-v1": validateSinglePack(sportsSingleJson, hasTutorialLocalizationKey),
  "clips-single-v1": validateSinglePack(clipsSingleJson, hasTutorialLocalizationKey)
};

export function getSinglePack(packId: string | undefined): SinglePack | undefined {
  return packId ? singlePacks[packId] : undefined;
}

/**
 * Packs for the missions that ask what to do rather than what something is.
 *
 * Their own registry because their shape is genuinely different: a situation and a set of
 * actions, with no image and no origin to judge. Sharing a registry would have meant one
 * type where half the fields never apply.
 */
export const decisionPacks: Readonly<Record<string, DecisionPack>> = {
  "decision-source-v1": validateDecisionPack(decisionSourceJson),
  "decision-influence-v1": validateDecisionPack(decisionInfluenceJson),
  "decision-limits-v1": validateDecisionPack(decisionLimitsJson),
  "decision-share-v1": validateDecisionPack(decisionShareJson)
};

export function getDecisionPack(packId: string | undefined): DecisionPack | undefined {
  return packId ? decisionPacks[packId] : undefined;
}

/** True when some authored pack, of any shape, answers to this id. */
export function hasContentPack(packId: string | undefined): boolean {
  return Boolean(getContentPack(packId) ?? getSinglePack(packId) ?? getDecisionPack(packId));
}

export type CreditedMedia = { packId: string; media: { id: string; provenance: ProvenanceMetadata } };

/** Public presentation keys for audited packs. Pack ids never leak into child-facing UI. */
export const creditedPackPresentationKeys = {
  "introductory-tutorial-v1": "basics1",
  "city-basics-timed-v1": "basics2",
  "animals-compare-v1": "animals1",
  "animals-timed-v1": "animals2",
  "animals-single-v1": "animals3",
  "sports-compare-v1": "sports1",
  "sports-single-v1": "sports2",
  "clips-single-v1": "videos1"
} as const;

/** Only audited assets are exposed publicly; this neutral list deliberately has no answer or side data. */
export function getCreditedMedia(): CreditedMedia[] {
  const comparisons = Object.entries(contentPacks).flatMap(([packId, pack]) =>
    pack.rounds.flatMap((round) =>
      round.choices
        .map((choice) => choice.media)
        .filter((media) => media.provenance.credit)
        .map((media) => ({ packId, media }))
    )
  );
  const singles = Object.entries(singlePacks).flatMap(([packId, pack]) =>
    pack.rounds
      .filter((round) => round.media.provenance.credit)
      .map((round) => ({ packId, media: round.media }))
  );
  return [...comparisons, ...singles];
}

/** The pack every player meets first; the tutorial route has no mission to ask. */
export const introductoryTutorialPack = contentPacks["introductory-tutorial-v1"];
