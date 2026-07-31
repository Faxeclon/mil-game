import type { TutorialLearningGoal, TutorialRound } from "@/content/schemas/tutorial";

export type LearningStep = "look" | "ask" | "check";
export type LearningStepState = "inactive" | "active" | "completed";

export const learningStepOrder: readonly LearningStep[] = ["look", "ask", "check"];

/** Each round advances one step of the Look - Ask - Check model. */
export const stepByLearningGoal: Record<TutorialLearningGoal, LearningStep> = {
  "visible-clue": "look",
  "source-and-purpose": "ask",
  uncertainty: "check"
};

/**
 * Earlier steps read as completed, the round's own step as active and later steps as
 * inactive, so the progression is cumulative rather than three separate highlights.
 */
export function getLearningStepStates(goal: TutorialLearningGoal): Record<LearningStep, LearningStepState> {
  const activeIndex = learningStepOrder.indexOf(stepByLearningGoal[goal]);
  return learningStepOrder.reduce(
    (states, step, index) => {
      states[step] = index < activeIndex ? "completed" : index === activeIndex ? "active" : "inactive";
      return states;
    },
    {} as Record<LearningStep, LearningStepState>
  );
}

export type FeedbackBlock = { labelKey: LearningStep | "remember"; textKey: string };

/**
 * Feedback is deliberately limited to two short blocks: the prompt for the round's own
 * step, followed by its reminder. Longer explanations are not shown to children.
 */
export function getFeedbackBlocks(round: TutorialRound): FeedbackBlock[] {
  const step = stepByLearningGoal[round.learningGoal];
  const promptKey =
    step === "look"
      ? round.feedback.observationKey
      : step === "ask"
        ? round.feedback.questionKey
        : round.feedback.verificationKey;

  return [
    ...(promptKey ? [{ labelKey: step, textKey: promptKey }] : []),
    { labelKey: "remember" as const, textKey: round.feedback.uncertaintyKey }
  ];
}

export type ChoiceVisualState = "idle" | "selected" | "ai" | "mistake" | "neutral";
export type ChoiceLabel = "yourChoice" | "aiChoice";

export type ChoicePresentation = {
  state: ChoiceVisualState;
  labels: ChoiceLabel[];
};

/**
 * After confirmation every meaning carries an explicit label, never colour alone: the
 * player's own card is always named, and the AI-generated card is always identified.
 */
export function getChoicePresentation(input: {
  answerSubmitted: boolean;
  selected: boolean;
  isAiChoice: boolean;
}): ChoicePresentation {
  const { answerSubmitted, selected, isAiChoice } = input;

  if (!answerSubmitted) {
    return { state: selected ? "selected" : "idle", labels: [] };
  }
  if (selected && isAiChoice) {
    return { state: "ai", labels: ["yourChoice", "aiChoice"] };
  }
  if (selected) {
    return { state: "mistake", labels: ["yourChoice"] };
  }
  if (isAiChoice) {
    return { state: "ai", labels: ["aiChoice"] };
  }
  return { state: "neutral", labels: [] };
}
