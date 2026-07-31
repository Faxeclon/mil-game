export type TutorialState =
  | { status: "intro" }
  | { status: "playing"; roundIndex: number; selectedChoiceId: string | null; answerSubmitted: boolean }
  | { status: "completed" };

export type TutorialAction =
  | { type: "start" }
  | { type: "select"; choiceId: string }
  | { type: "submit" }
  | { type: "next"; totalRounds: number }
  | { type: "restart" };

export const initialTutorialState: TutorialState = { status: "intro" };

function playingState(roundIndex: number): TutorialState {
  return { status: "playing", roundIndex, selectedChoiceId: null, answerSubmitted: false };
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
    return { ...state, answerSubmitted: true };
  }
  if (action.type === "next") {
    if (!state.answerSubmitted) return state;
    return state.roundIndex >= action.totalRounds - 1 ? { status: "completed" } : playingState(state.roundIndex + 1);
  }
  return state;
}
