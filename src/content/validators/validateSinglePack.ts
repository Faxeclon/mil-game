import {
  primaryFeedbackKeyByGoal,
  provenanceSourceTypes,
  singleAnswers,
  tutorialLearningGoals,
  type ProvenanceSourceType,
  type SingleAnswer,
  type SinglePack,
  type SingleRound
} from "@/content/schemas/tutorial";
import { TutorialPackValidationError, type LocalizationKeyChecker } from "./validateTutorialPack";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new TutorialPackValidationError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateKey(key: unknown, path: string, hasLocalizationKey: LocalizationKeyChecker): asserts key is string {
  assert(typeof key === "string" && key.length > 0, `${path} must be a localization key.`);
  assert(!key.startsWith("tutorial."), `${path} must be relative to the tutorial namespace.`);
  assert(hasLocalizationKey(key), `${path} is missing from localized messages: ${key}.`);
}

function validateRound(
  round: unknown,
  index: number,
  roundIds: Set<string>,
  hasLocalizationKey: LocalizationKeyChecker
): asserts round is SingleRound {
  const path = `rounds[${index}]`;
  assert(isRecord(round), `${path} must be an object.`);
  assert(typeof round.id === "string" && round.id.length > 0, `${path}.id is required.`);
  assert(!roundIds.has(round.id), `duplicate round id: ${round.id}.`);
  roundIds.add(round.id);
  assert(round.order === index + 1, `${path}.order must be ${index + 1}.`);
  assert(
    typeof round.learningGoal === "string" &&
      tutorialLearningGoals.includes(round.learningGoal as SingleRound["learningGoal"]),
    `${path}.learningGoal is unsupported.`
  );
  validateKey(round.promptKey, `${path}.promptKey`, hasLocalizationKey);

  assert(isRecord(round.media), `${path}.media is required.`);
  const media = round.media;
  assert(typeof media.id === "string" && media.id.length > 0, `${path}.media.id is required.`);
  assert(typeof media.src === "string" && media.src.length > 0, `${path}.media.src is required.`);
  validateKey(media.altKey, `${path}.media.altKey`, hasLocalizationKey);
  assert(isRecord(media.provenance), `${path}.media.provenance is required.`);
  assert(
    typeof media.provenance.sourceType === "string" &&
      provenanceSourceTypes.includes(media.provenance.sourceType as ProvenanceSourceType),
    `${path}.media.provenance.sourceType is invalid.`
  );
  assert(typeof media.provenance.sourceName === "string" && media.provenance.sourceName.length > 0, `${path}.media.provenance.sourceName is required.`);
  assert(typeof media.provenance.licenseStatus === "string" && media.provenance.licenseStatus.length > 0, `${path}.media.provenance.licenseStatus is required.`);
  assert(typeof media.provenance.temporary === "boolean", `${path}.media.provenance.temporary is required.`);
  if (media.src.includes("/placeholders/")) {
    assert(media.provenance.temporary, `${path}.media.provenance.temporary must be true for placeholder media.`);
  }

  assert(
    singleAnswers.includes(round.answer as SingleAnswer),
    `${path}.answer must be one of: ${singleAnswers.join(", ")}.`
  );
  // The answer is the image's own origin: a round cannot teach one thing and record another.
  assert(media.origin === round.answer, `${path}.answer must match the media origin.`);

  assert(isRecord(round.feedback), `${path}.feedback is required.`);
  const primaryKey = primaryFeedbackKeyByGoal[round.learningGoal as SingleRound["learningGoal"]];
  validateKey(round.feedback[primaryKey], `${path}.feedback.${primaryKey}`, hasLocalizationKey);
  validateKey(round.feedback.uncertaintyKey, `${path}.feedback.uncertaintyKey`, hasLocalizationKey);
}

/**
 * Rejects an invalid single-image pack during development and builds, on the same terms
 * as the comparison packs: every text is a localization key present in both languages,
 * and every placeholder is marked as temporary.
 */
export function validateSinglePack(pack: unknown, hasLocalizationKey: LocalizationKeyChecker): SinglePack {
  assert(isRecord(pack), "pack must be an object.");
  assert(typeof pack.id === "string" && pack.id.length > 0, "pack.id is required.");
  assert(typeof pack.allowsUncertain === "boolean", "pack.allowsUncertain must be specified.");
  assert(Array.isArray(pack.rounds) && pack.rounds.length === 3, "pack.rounds must contain exactly three rounds.");

  const roundIds = new Set<string>();
  for (let index = 0; index < pack.rounds.length; index += 1) {
    validateRound(pack.rounds[index], index, roundIds, hasLocalizationKey);
  }

  // More than one answer must appear, or the mission is won by always tapping the same button.
  const answers = new Set((pack.rounds as SingleRound[]).map((round) => round.answer));
  assert(answers.size > 1, "pack.rounds must not all share the same answer.");

  /*
   * The third button and the rounds that need it travel together. Offering "I cannot
   * tell" where it is never right teaches a child that doubting is always wrong; asking
   * for it where the button is hidden makes the round unanswerable.
   */
  if (pack.allowsUncertain) {
    assert(answers.has("unknown"), "a pack offering the uncertain answer must use it at least once.");
  } else {
    assert(!answers.has("unknown"), "a round cannot answer unknown unless the pack offers it.");
  }

  return pack as SinglePack;
}
