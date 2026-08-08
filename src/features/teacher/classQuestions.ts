import type { SinglePack, TutorialMediaAsset, TutorialPack } from "@/content/schemas/tutorial";
import { getContentPack, getSinglePack } from "@/content/packs/packRegistry";
import type { MissionBlueprint } from "@/features/levels/levelModel";
import type { CardAnswer } from "./classCards";

/**
 * Any mission, turned into questions a paper card can answer.
 *
 * A card has two sides, and what those sides mean is not fixed: comparing two pictures
 * asks "which one", judging a single one asks "who made it". Rather than restricting the
 * classroom to the missions that happen to fit, each mission says what its A and B stand
 * for and the screen tells the class before they lift anything.
 *
 * One kind of round is deliberately left out. Where the right answer is "you cannot tell
 * by looking", a two-sided card has no way to say it - and that answer is the most
 * valuable thing this game teaches, so it is skipped rather than flattened into a side.
 */
export type ClassQuestionKind = "compare" | "single";

export type ClassQuestion = {
  id: string;
  kind: ClassQuestionKind;
  /** Two images for a comparison, one for a single. */
  media: readonly TutorialMediaAsset[];
  /** Message keys, inside the `cards` namespace, naming what each side means. */
  labelKeys: readonly [string, string];
  correct: CardAnswer;
};

/** The card is printed A above and B below, so the left image is A and the right is B. */
function sideOfPosition(position: "left" | "right"): CardAnswer {
  return position === "left" ? "A" : "B";
}

function fromComparePack(pack: TutorialPack): ClassQuestion[] {
  return pack.rounds.flatMap((round) => {
    const correct = round.choices.find((choice) => choice.id === round.correctChoiceId);
    // A round whose answer cannot be read is dropped, never scored against a guess.
    if (!correct) return [];

    const ordered = ["left", "right"].map((position) =>
      round.choices.find((choice) => choice.position === position)
    );
    if (ordered.some((choice) => !choice)) return [];

    return [
      {
        id: round.id,
        kind: "compare" as const,
        media: ordered.map((choice) => choice!.media),
        // Both sides mean a picture, so the labels are the letters themselves.
        labelKeys: ["answerA", "answerB"] as const,
        correct: sideOfPosition(correct.position)
      }
    ];
  });
}

function fromSinglePack(pack: SinglePack): ClassQuestion[] {
  return pack.rounds.flatMap((round) => {
    // "Unknown" is a real answer here and a card cannot express it, so the round is left
    // for the phone rather than asked badly in class.
    if (round.answer !== "ai-generated" && round.answer !== "camera-captured") return [];

    return [
      {
        id: round.id,
        kind: "single" as const,
        media: [round.media],
        labelKeys: ["optionAi", "optionCamera"] as const,
        correct: round.answer === "ai-generated" ? "A" : "B"
      }
    ];
  });
}

/** Every question this mission can put to a class, in the order the pack authored them. */
export function buildClassQuestions(mission: MissionBlueprint): ClassQuestion[] {
  const comparePack = getContentPack(mission.packId);
  if (comparePack) return fromComparePack(comparePack);

  const singlePack = getSinglePack(mission.packId);
  return singlePack ? fromSinglePack(singlePack) : [];
}

/** True when a mission has anything at all a class could answer with cards. */
export function canBeAskedInClass(mission: MissionBlueprint): boolean {
  return buildClassQuestions(mission).length > 0;
}

/**
 * How many of a mission's rounds the cards can carry.
 *
 * Shown to the teacher before they choose, because a mission that loses a round to the
 * uncertain answer should say so rather than quietly ask fewer questions than it has.
 */
export function countAskableRounds(mission: MissionBlueprint): { askable: number; total: number } {
  const comparePack = getContentPack(mission.packId);
  const singlePack = getSinglePack(mission.packId);
  const total = comparePack?.rounds.length ?? singlePack?.rounds.length ?? 0;

  return { askable: buildClassQuestions(mission).length, total };
}
