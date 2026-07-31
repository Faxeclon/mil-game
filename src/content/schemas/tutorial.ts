import type { InformationReliability, MediaOrigin } from "@/types";

export const tutorialLearningGoals = [
  "visible-clue",
  "source-and-purpose",
  "uncertainty"
] as const;

export type TutorialLearningGoal = (typeof tutorialLearningGoals)[number];

export type ProvenanceMetadata = {
  sourceType: "project-placeholder" | "project-created" | "licensed";
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

export type EducationalFeedback = {
  observationKey: string;
  explanationKey: string;
  questionKey?: string;
  verificationKey?: string;
  uncertaintyKey?: string;
};

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

