import type { RoundOutcome } from "@/features/scoring/levelScore";

export type TutorialState =
  | { status: "intro" }
  | {
      status: "playing";
      roundIndex: number;
      selectedChoiceId: string | null;
      answerSubmitted: boolean;
      /** Rounds answered correctly so far; reported on the results screen, never shown as a score during play. */
      correctRounds: number;
      /**
       * What happened in every round already closed, in order. The attempt score is
       * calculated from this list alone, so scoring never has to look at the questions.
       */
      roundOutcomes: readonly RoundOutcome[];
    }
  | { status: "completed"; correctRounds: number; roundOutcomes: readonly RoundOutcome[] };

export type TutorialAction =
  | { type: "start" }
  | { type: "select"; choiceId: string }
  /** Timings are supplied only by timed rounds; without them the round scores as untimed. */
  | { type: "submit"; correct?: boolean; remainingMs?: number; durationMs?: number }
  /** Time ran out: the round locks even if nothing was chosen. */
  | { type: "timeout" }
  | { type: "next"; totalRounds: number }
  | { type: "restart" };

export const initialTutorialState: TutorialState = { status: "intro" };

/**
 * Only the very first mission of the game explains itself; every later one starts
 * playing straight away, because the player already knows the rules.
 */
export function createInitialTutorialState(showBriefing: boolean): TutorialState {
  return showBriefing ? initialTutorialState : playingState(0);
}

/** Derived, never tracked apart, so the count can never disagree with the rounds themselves. */
function countCorrect(roundOutcomes: readonly RoundOutcome[]): number {
  return roundOutcomes.filter((outcome) => outcome.result === "correct").length;
}

function playingState(roundIndex: number, roundOutcomes: readonly RoundOutcome[] = []): TutorialState {
  return {
    status: "playing",
    roundIndex,
    selectedChoiceId: null,
    answerSubmitted: false,
    correctRounds: countCorrect(roundOutcomes),
    roundOutcomes
  };
}

function submittedOutcome(action: { correct?: boolean; remainingMs?: number; durationMs?: number }): RoundOutcome {
  if (!action.correct) return { result: "incorrect" };
  return {
    result: "correct",
    // Absent keys mean "no clock", which the score treats as untimed rather than slow.
    ...(typeof action.remainingMs === "number" ? { remainingMs: action.remainingMs } : {}),
    ...(typeof action.durationMs === "number" ? { durationMs: action.durationMs } : {})
  };
}

export function tutorialReducer(state: TutorialState, action: TutorialAction): TutorialState {
  if (action.type === "restart") return playingState(0);
  if (action.type === "start") return state.status === "intro" ? playingState(0) : state;
  if (state.status !== "playing") return state;

  if (action.type === "select") {
    if (state.answerSubmitted) return state;
    return {
      ...state,
      selectedChoiceId: state.selectedChoiceId === action.choiceId ? null : action.choiceId
    };
  }
  if (action.type === "submit") {
    if (state.answerSubmitted || state.selectedChoiceId === null) return state;
    const roundOutcomes = [...state.roundOutcomes, submittedOutcome(action)];
    return {
      ...state,
      answerSubmitted: true,
      correctRounds: countCorrect(roundOutcomes),
      roundOutcomes
    };
  }
  if (action.type === "timeout") {
    // Running out of time counts as an unanswered round, never as a correct one.
    if (state.answerSubmitted) return state;
    return {
      ...state,
      answerSubmitted: true,
      roundOutcomes: [...state.roundOutcomes, { result: "timeout" }]
    };
  }
  if (action.type === "next") {
    if (!state.answerSubmitted) return state;
    return state.roundIndex >= action.totalRounds - 1
      ? { status: "completed", correctRounds: state.correctRounds, roundOutcomes: state.roundOutcomes }
      : playingState(state.roundIndex + 1, state.roundOutcomes);
  }
  return state;
}
