import type { InformationReliability, MediaOrigin } from "@/types";

export const tutorialLearningGoals = [
  "visible-clue",
  "source-and-purpose",
  "uncertainty"
] as const;

export type TutorialLearningGoal = (typeof tutorialLearningGoals)[number];

export const provenanceSourceTypes = [
  "project-placeholder",
  "project-created",
  "project-generated",
  "licensed",
  "external-unverified"
] as const;

export type ProvenanceSourceType = (typeof provenanceSourceTypes)[number];

export type ProvenanceMetadata = {
  sourceType: ProvenanceSourceType;
  sourceName: string;
  licenseStatus: string;
  generationMethod?: string;
  temporary: boolean;
  sourceReference?: string;
};

export type TutorialMediaAsset = {
  id: string;
  src: string;
  altKey: string;
  origin: MediaOrigin;
  reliability?: InformationReliability;
  provenance: ProvenanceMetadata;
};

export type MediaChoice = {
  id: string;
  position: "left" | "right";
  media: TutorialMediaAsset;
};

/**
 * Feedback stays deliberately short for children aged 6-10: one prompt matching the
 * round's learning goal, plus one closing reminder. Longer explanations are avoided.
 */
export type EducationalFeedback = {
  observationKey?: string;
  questionKey?: string;
  verificationKey?: string;
  uncertaintyKey: string;
};

/** The single prompt each learning goal must provide before its reminder. */
export const primaryFeedbackKeyByGoal = {
  "visible-clue": "observationKey",
  "source-and-purpose": "questionKey",
  uncertainty: "verificationKey"
} as const satisfies Record<TutorialLearningGoal, keyof EducationalFeedback>;

export type TutorialRound = {
  id: string;
  order: number;
  learningGoal: TutorialLearningGoal;
  promptKey: string;
  choices: [MediaChoice, MediaChoice];
  correctChoiceId: string;
  feedback: EducationalFeedback;
};

export type TutorialPack = {
  id: string;
  rounds: [TutorialRound, TutorialRound, TutorialRound];
};

/**
 * What a player can answer about one image.
 *
 * "unknown" is not a way out: for some images looking really is not enough, and saying
 * so is the correct answer. Teaching a child that "I cannot tell by looking" is a valid
 * conclusion is the opposite of what the internet rewards, and it is the most valuable
 * thing this game has to offer.
 */
export const singleAnswers = ["ai-generated", "camera-captured", "unknown"] as const;

export type SingleAnswer = (typeof singleAnswers)[number];

/**
 * One image, judged on its own.
 *
 * Comparing two pictures hands the player a clue for free: whatever differs is worth
 * looking at. With a single image that help disappears and the child has to apply their
 * own criteria, which is the step that actually transfers outside the game.
 */
export type SingleRound = {
  id: string;
  order: number;
  learningGoal: TutorialLearningGoal;
  promptKey: string;
  media: TutorialMediaAsset;
  answer: SingleAnswer;
  feedback: EducationalFeedback;
};

export type SinglePack = {
  id: string;
  /**
   * Whether "I cannot tell by looking" is on offer. It is shown only in packs built for
   * it, so a child is never given a third button that can never be right.
   */
  allowsUncertain: boolean;
  rounds: [SingleRound, SingleRound, SingleRound];
};

