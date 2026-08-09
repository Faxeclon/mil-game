import type { MediaOrigin } from "@/types";
import {
  primaryFeedbackKeyByGoal,
  provenanceSourceTypes,
  tutorialLearningGoals,
  type MediaChoice,
  type ProvenanceSourceType,
  type TutorialPack,
  type TutorialRound
} from "@/content/schemas/tutorial";

const mediaOrigins: readonly MediaOrigin[] = [
  "camera-captured",
  "ai-generated",
  "digitally-edited",
  "unknown"
];

export class TutorialPackValidationError extends Error {
  constructor(message: string) {
    super(`Invalid tutorial pack: ${message}`);
    this.name = "TutorialPackValidationError";
  }
}

export type LocalizationKeyChecker = (key: string) => boolean;

const optionalFeedbackKeys = ["observationKey", "questionKey", "verificationKey"] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TutorialPackValidationError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateKey(key: unknown, path: string, hasLocalizationKey: LocalizationKeyChecker): asserts key is string {
  assert(typeof key === "string" && key.length > 0, `${path} must be a localization key.`);
  assert(!key.startsWith("tutorial."), `${path} must be relative to the tutorial namespace, not prefixed with tutorial.`);
  assert(hasLocalizationKey(key), `${path} is missing from localized messages: ${key}.`);
}

function validateChoice(choice: unknown, path: string, hasLocalizationKey: LocalizationKeyChecker): asserts choice is MediaChoice {
  assert(isRecord(choice), `${path} must be an object.`);
  assert(typeof choice.id === "string" && choice.id.length > 0, `${path}.id is required.`);
  assert(choice.position === "left" || choice.position === "right", `${path}.position must be left or right.`);
  assert(isRecord(choice.media), `${path}.media is required.`);

  const media = choice.media;
  assert(typeof media.id === "string" && media.id.length > 0, `${path}.media.id is required.`);
  assert(typeof media.src === "string" && media.src.length > 0, `${path}.media.src is required.`);
  validateKey(media.altKey, `${path}.media.altKey`, hasLocalizationKey);
  assert(mediaOrigins.includes(media.origin as MediaOrigin), `${path}.media.origin is invalid.`);
  assert(isRecord(media.provenance), `${path}.media.provenance is required.`);
  assert(
    typeof media.provenance.sourceType === "string" &&
      provenanceSourceTypes.includes(media.provenance.sourceType as ProvenanceSourceType),
    `${path}.media.provenance.sourceType is invalid.`
  );
  assert(typeof media.provenance.sourceName === "string" && media.provenance.sourceName.length > 0, `${path}.media.provenance.sourceName is required.`);
  assert(typeof media.provenance.licenseStatus === "string" && media.provenance.licenseStatus.length > 0, `${path}.media.provenance.licenseStatus is required.`);
  assert(typeof media.provenance.temporary === "boolean", `${path}.media.provenance.temporary must be specified.`);
  if (media.src.includes("/placeholders/")) {
    assert(media.provenance.temporary, `${path}.media.provenance.temporary must be true for placeholder media.`);
  }
}

function validateRound(round: unknown, index: number, roundIds: Set<string>, hasLocalizationKey: LocalizationKeyChecker): asserts round is TutorialRound {
  const path = `rounds[${index}]`;
  assert(isRecord(round), `${path} must be an object.`);
  assert(typeof round.id === "string" && round.id.length > 0, `${path}.id is required.`);
  assert(!roundIds.has(round.id), `duplicate round id: ${round.id}.`);
  roundIds.add(round.id);
  assert(round.order === index + 1, `${path}.order must be ${index + 1}.`);
  assert(typeof round.learningGoal === "string" && tutorialLearningGoals.includes(round.learningGoal as TutorialRound["learningGoal"]), `${path}.learningGoal is unsupported.`);
  validateKey(round.promptKey, `${path}.promptKey`, hasLocalizationKey);
  assert(Array.isArray(round.choices) && round.choices.length === 2, `${path}.choices must contain exactly two choices.`);

  const choiceIds = new Set<string>();
  const positions = new Set<string>();
  for (let choiceIndex = 0; choiceIndex < round.choices.length; choiceIndex += 1) {
    const choice = round.choices[choiceIndex];
    validateChoice(choice, `${path}.choices[${choiceIndex}]`, hasLocalizationKey);
    assert(!choiceIds.has(choice.id), `${path} has duplicate choice id: ${choice.id}.`);
    choiceIds.add(choice.id);
    positions.add(choice.position);
  }
  assert(positions.has("left") && positions.has("right"), `${path} must provide one left and one right choice.`);
  assert(typeof round.correctChoiceId === "string" && choiceIds.has(round.correctChoiceId), `${path}.correctChoiceId must reference a choice.`);
  const correctChoice = round.choices.find((choice) => choice.id === round.correctChoiceId);
  assert(correctChoice?.media.origin === "ai-generated", `${path}.correctChoiceId must reference the AI-generated learning choice.`);

  assert(isRecord(round.feedback), `${path}.feedback is required.`);
  const primaryKey = primaryFeedbackKeyByGoal[round.learningGoal as TutorialRound["learningGoal"]];
  validateKey(round.feedback[primaryKey], `${path}.feedback.${primaryKey}`, hasLocalizationKey);
  validateKey(round.feedback.uncertaintyKey, `${path}.feedback.uncertaintyKey`, hasLocalizationKey);
  for (const key of optionalFeedbackKeys) {
    if (round.feedback[key] !== undefined) validateKey(round.feedback[key], `${path}.feedback.${key}`, hasLocalizationKey);
  }
}

export function validateTutorialPack(pack: unknown, hasLocalizationKey: LocalizationKeyChecker): TutorialPack {
  assert(isRecord(pack), "pack must be an object.");
  assert(typeof pack.id === "string" && pack.id.length > 0, "pack.id is required.");
  assert(Array.isArray(pack.rounds) && pack.rounds.length === 3, "pack.rounds must contain exactly three rounds.");

  const roundIds = new Set<string>();
  for (let index = 0; index < pack.rounds.length; index += 1) {
    validateRound(pack.rounds[index], index, roundIds, hasLocalizationKey);
  }

  return pack as TutorialPack;
}

export function collectTutorialLocalizationKeys(pack: TutorialPack): string[] {
  return pack.rounds.flatMap((round) => [
    round.promptKey,
    ...round.choices.map((choice) => choice.media.altKey),
    ...(round.feedback.observationKey ? [round.feedback.observationKey] : []),
    ...(round.feedback.questionKey ? [round.feedback.questionKey] : []),
    ...(round.feedback.verificationKey ? [round.feedback.verificationKey] : []),
    round.feedback.uncertaintyKey
  ]);
}
