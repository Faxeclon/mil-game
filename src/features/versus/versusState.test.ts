import { describe, expect, it } from "vitest";
import { contentPacks } from "@/content/packs/packRegistry";
import type { TutorialRound } from "@/content/schemas/tutorial";
import {
  buildVersusDeck,
  getPlayerForRound,
  getVersusOutcome,
  initialVersusState,
  versusReducer,
  type VersusState
} from "./versusState";

const allRounds: TutorialRound[] = Object.values(contentPacks).flatMap((pack) => pack.rounds);

function playTurn(state: VersusState, correct: boolean, totalRounds: number): VersusState {
  let next = versusReducer(state, { type: "ready" });
  next = versusReducer(next, { type: "select", choiceId: "choice" });
  next = versusReducer(next, { type: "submit", correct });
  return versusReducer(next, { type: "next", totalRounds });
}

describe("whose turn it is", () => {
  it("alternates from the first turn onwards", () => {
    expect([0, 1, 2, 3].map(getPlayerForRound)).toEqual([1, 2, 1, 2]);
  });

  it("hands the phone over before every turn, starting with player one", () => {
    const started = versusReducer(initialVersusState, { type: "start" });

    expect(started).toEqual({ status: "handover", roundIndex: 0, player: 1, scores: [0, 0] });
  });

  it("shows nothing until the next player says they are ready", () => {
    const started = versusReducer(initialVersusState, { type: "start" });

    // A shared phone means the previous player is still watching; the round only opens
    // once whoever holds it now confirms.
    expect(versusReducer(started, { type: "select", choiceId: "a" })).toBe(started);
    expect(versusReducer(started, { type: "ready" })).toMatchObject({ status: "playing", player: 1 });
  });
});

describe("scoring a match", () => {
  it("gives the point to whoever was playing that turn", () => {
    let state = versusReducer(initialVersusState, { type: "start" });
    state = playTurn(state, true, 4);
    expect(state).toMatchObject({ status: "handover", player: 2, scores: [1, 0] });

    state = playTurn(state, true, 4);
    expect(state).toMatchObject({ status: "handover", player: 1, scores: [1, 1] });
  });

  it("gives no point for a wrong answer", () => {
    let state = versusReducer(initialVersusState, { type: "start" });
    state = playTurn(state, false, 4);

    expect(state).toMatchObject({ scores: [0, 0] });
  });

  it("locks the turn once it is confirmed", () => {
    let state = versusReducer(initialVersusState, { type: "start" });
    state = versusReducer(state, { type: "ready" });
    state = versusReducer(state, { type: "select", choiceId: "a" });
    const submitted = versusReducer(state, { type: "submit", correct: true });

    expect(versusReducer(submitted, { type: "submit", correct: true })).toBe(submitted);
    expect(versusReducer(submitted, { type: "select", choiceId: "b" })).toBe(submitted);
    expect(submitted).toMatchObject({ scores: [1, 0], lastCorrect: true });
  });

  it("does not let a turn be confirmed without a choice, or skipped without confirming", () => {
    const ready = versusReducer(versusReducer(initialVersusState, { type: "start" }), { type: "ready" });

    expect(versusReducer(ready, { type: "submit", correct: true })).toBe(ready);
    expect(versusReducer(ready, { type: "next", totalRounds: 4 })).toBe(ready);
  });

  it("keeps the result hidden until the turn is confirmed", () => {
    const ready = versusReducer(versusReducer(initialVersusState, { type: "start" }), { type: "ready" });

    expect(ready).toMatchObject({ lastCorrect: null });
  });

  it("ends after the last turn and can start over from scratch", () => {
    let state = versusReducer(initialVersusState, { type: "start" });
    for (const correct of [true, false, true, true]) state = playTurn(state, correct, 4);

    expect(state).toEqual({ status: "finished", scores: [2, 1] });
    expect(versusReducer(state, { type: "restart" })).toEqual(initialVersusState);
  });
});

describe("who won", () => {
  it("names the winner, and calls an equal match a draw", () => {
    expect(getVersusOutcome([3, 1])).toEqual({ kind: "win", player: 1 });
    expect(getVersusOutcome([1, 3])).toEqual({ kind: "win", player: 2 });
    expect(getVersusOutcome([2, 2])).toEqual({ kind: "draw" });
    expect(getVersusOutcome([0, 0])).toEqual({ kind: "draw" });
  });
});

describe("the deck of a match", () => {
  it("gives both players the same number of turns", () => {
    expect(buildVersusDeck(allRounds, 3, () => 0)).toHaveLength(6);
    expect(buildVersusDeck(allRounds, 1, () => 0)).toHaveLength(2);
    expect(buildVersusDeck(allRounds, 0, () => 0)).toHaveLength(0);
  });

  it("never repeats a round inside one match", () => {
    const deck = buildVersusDeck(allRounds, 4, () => 0.5);
    const ids = deck.map((round) => round.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stays even when there are not enough rounds to fill the match", () => {
    const deck = buildVersusDeck(allRounds.slice(0, 3), 5, () => 0);

    expect(deck).toHaveLength(2);
  });

  it("draws different matches from different luck", () => {
    const first = buildVersusDeck(allRounds, 3, () => 0).map((round) => round.id);
    const last = buildVersusDeck(allRounds, 3, () => 0.999).map((round) => round.id);

    expect(first).not.toEqual(last);
  });

  it("survives a broken random source instead of dealing nothing", () => {
    expect(buildVersusDeck(allRounds, 2, () => Number.NaN)).toHaveLength(4);
    expect(buildVersusDeck(allRounds, 2, () => -5)).toHaveLength(4);
    expect(buildVersusDeck(allRounds, 2, () => 12)).toHaveLength(4);
  });
});
