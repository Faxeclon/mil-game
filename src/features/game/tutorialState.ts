export type TutorialState =
  | { status: "intro" }
  | {
      status: "playing";
      roundIndex: number;
      selectedChoiceId: string | null;
      answerSubmitted: boolean;
      /** Rounds answered correctly so far; reported on the results screen, never shown as a score during play. */
      correctRounds: number;
    }
  | { status: "completed"; correctRounds: number };

export type TutorialAction =
  | { type: "start" }
  | { type: "select"; choiceId: string }
  | { type: "submit"; correct?: boolean }
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

function playingState(roundIndex: number, correctRounds = 0): TutorialState {
  return { status: "playing", roundIndex, selectedChoiceId: null, answerSubmitted: false, correctRounds };
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
    return {
      ...state,
      answerSubmitted: true,
      correctRounds: state.correctRounds + (action.correct ? 1 : 0)
    };
  }
  if (action.type === "timeout") {
    // Running out of time counts as an unanswered round, never as a correct one.
    return state.answerSubmitted ? state : { ...state, answerSubmitted: true };
  }
  if (action.type === "next") {
    if (!state.answerSubmitted) return state;
    return state.roundIndex >= action.totalRounds - 1
      ? { status: "completed", correctRounds: state.correctRounds }
      : playingState(state.roundIndex + 1, state.correctRounds);
  }
  return state;
}
