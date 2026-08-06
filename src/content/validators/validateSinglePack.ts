import {
  primaryFeedbackKeyByGoal,
  singleAnswers,
  tutorialLearningGoals,
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
  assert(Array.isArray(pack.rounds) && pack.rounds.length === 3, "pack.rounds must contain exactly three rounds.");

  const roundIds = new Set<string>();
  for (let index = 0; index < pack.rounds.length; index += 1) {
    validateRound(pack.rounds[index], index, roundIds, hasLocalizationKey);
  }

  // Both answers must appear, or the mission can be won by always tapping the same button.
  const answers = new Set((pack.rounds as SingleRound[]).map((round) => round.answer));
  assert(answers.size > 1, "pack.rounds must not all share the same answer.");

  return pack as SinglePack;
}
