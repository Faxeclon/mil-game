import type { TutorialRound } from "@/content/schemas/tutorial";

/**
 * Two children, one phone, no internet and no accounts.
 *
 * In the places this game is for, a shared family phone is the norm rather than the
 * exception, so the versus mode is built for it on purpose: players take turns and pass
 * the device along. Nothing is stored and nothing is sent anywhere — a match is a moment,
 * not a record — which is also why this file has no dependency on progress or storage.
 *
 * The real lesson is not the score. It is the argument the two of them have while the
 * phone changes hands: "that one's AI!" "no, look at the hand!".
 */
export type VersusPlayer = 1 | 2;

export type VersusScores = readonly [number, number];

export type VersusState =
  | { status: "lobby" }
  /** The phone is being handed over; nothing is shown until the next player says they are ready. */
  | { status: "handover"; roundIndex: number; player: VersusPlayer; scores: VersusScores }
  | {
      status: "playing";
      roundIndex: number;
      player: VersusPlayer;
      scores: VersusScores;
      selectedChoiceId: string | null;
      answerSubmitted: boolean;
      /** Null until the turn is confirmed, so the screen never reveals it early. */
      lastCorrect: boolean | null;
    }
  | { status: "finished"; scores: VersusScores };

export type VersusAction =
  | { type: "start" }
  | { type: "ready" }
  | { type: "select"; choiceId: string }
  | { type: "submit"; correct: boolean }
  | { type: "next"; totalRounds: number }
  | { type: "restart" };

export const initialVersusState: VersusState = { status: "lobby" };

/** Turns alternate: odd turns belong to player one, even ones to player two. */
export function getPlayerForRound(roundIndex: number): VersusPlayer {
  return roundIndex % 2 === 0 ? 1 : 2;
}

function addPoint(scores: VersusScores, player: VersusPlayer): VersusScores {
  return player === 1 ? [scores[0] + 1, scores[1]] : [scores[0], scores[1] + 1];
}

function handover(roundIndex: number, scores: VersusScores): VersusState {
  return { status: "handover", roundIndex, player: getPlayerForRound(roundIndex), scores };
}

export function versusReducer(state: VersusState, action: VersusAction): VersusState {
  if (action.type === "restart") return initialVersusState;
  if (action.type === "start") {
    return state.status === "lobby" ? handover(0, [0, 0]) : state;
  }
  if (action.type === "ready") {
    if (state.status !== "handover") return state;
    return {
      status: "playing",
      roundIndex: state.roundIndex,
      player: state.player,
      scores: state.scores,
      selectedChoiceId: null,
      answerSubmitted: false,
      lastCorrect: null
    };
  }
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
      lastCorrect: action.correct,
      scores: action.correct ? addPoint(state.scores, state.player) : state.scores
    };
  }
  if (action.type === "next") {
    if (!state.answerSubmitted) return state;
    const nextRound = state.roundIndex + 1;
    return nextRound >= action.totalRounds
      ? { status: "finished", scores: state.scores }
      : handover(nextRound, state.scores);
  }
  return state;
}

export type VersusOutcome = { kind: "win"; player: VersusPlayer } | { kind: "draw" };

export function getVersusOutcome(scores: VersusScores): VersusOutcome {
  if (scores[0] === scores[1]) return { kind: "draw" };
  return { kind: "win", player: scores[0] > scores[1] ? 1 : 2 };
}

/**
 * Builds the deck for one match out of the authored rounds.
 *
 * Both players must face the same number of turns, so the deck is always even; and the
 * rounds are drawn without repetition, because meeting the same pair twice in one match
 * would turn the second turn into memory rather than judgement.
 */
export function buildVersusDeck(
  rounds: readonly TutorialRound[],
  turnsPerPlayer: number,
  random: () => number = Math.random
): TutorialRound[] {
  const wanted = Math.max(0, Math.trunc(turnsPerPlayer)) * 2;
  const pool = [...rounds];
  const deck: TutorialRound[] = [];

  while (deck.length < wanted && pool.length > 0) {
    const draw = random();
    const safeDraw = Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 0.999_999) : 0;
    deck.push(...pool.splice(Math.floor(safeDraw * pool.length), 1));
  }

  // An odd deck would give one player an extra turn, so the last card is dropped instead.
  return deck.length % 2 === 0 ? deck : deck.slice(0, -1);
}
