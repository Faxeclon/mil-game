import { describe, expect, it } from "vitest";
import {
  initialTutorialState,
  tutorialReducer,
  type TutorialAction,
  type TutorialState
} from "./tutorialState";

describe("tutorialReducer", () => {
  it("starts on round one", () => {
    const state = tutorialReducer(initialTutorialState, { type: "start" });
    expect(state).toMatchObject({ status: "playing", roundIndex: 0, selectedChoiceId: null, answerSubmitted: false });
  });

  it("switches or clears a selection before submission", () => {
    const started = tutorialReducer(initialTutorialState, { type: "start" });
    const selected = tutorialReducer(started, { type: "select", choiceId: "left" });
    const switched = tutorialReducer(selected, { type: "select", choiceId: "right" });
    const cleared = tutorialReducer(switched, { type: "select", choiceId: "right" });

    expect(selected).toMatchObject({ selectedChoiceId: "left", answerSubmitted: false });
    expect(switched).toMatchObject({ selectedChoiceId: "right", answerSubmitted: false });
    expect(cleared).toMatchObject({ selectedChoiceId: null, answerSubmitted: false });
  });

  it("locks the submitted answer and ignores repeated confirmation", () => {
    const started = tutorialReducer(initialTutorialState, { type: "start" });
    const selected = tutorialReducer(started, { type: "select", choiceId: "left" });
    const submitted = tutorialReducer(selected, { type: "submit" });
    const repeatedSubmission = tutorialReducer(submitted, { type: "submit" });
    const attemptedChange = tutorialReducer(submitted, { type: "select", choiceId: "right" });

    expect(submitted).toMatchObject({ selectedChoiceId: "left", answerSubmitted: true });
    expect(repeatedSubmission).toEqual(submitted);
    expect(attemptedChange).toEqual(submitted);
  });

  it("does not advance before feedback and advances after submission", () => {
    const started = tutorialReducer(initialTutorialState, { type: "start" });
    const notAdvanced = tutorialReducer(started, { type: "next", totalRounds: 3 });
    const selected = tutorialReducer(started, { type: "select", choiceId: "left" });
    const submitted = tutorialReducer(selected, { type: "submit" });
    const advanced = tutorialReducer(submitted, { type: "next", totalRounds: 3 });

    expect(notAdvanced).toEqual(started);
    expect(advanced).toMatchObject({ status: "playing", roundIndex: 1, selectedChoiceId: null, answerSubmitted: false });
  });

  it("completes after the third submitted round", () => {
    let state = tutorialReducer(initialTutorialState, { type: "start" });
    for (let index = 0; index < 3; index += 1) {
      state = tutorialReducer(state, { type: "select", choiceId: `choice-${index}` });
      state = tutorialReducer(state, { type: "submit" });
      state = tutorialReducer(state, { type: "next", totalRounds: 3 });
    }
    expect(state).toMatchObject({ status: "completed", correctRounds: 0 });
  });

  it("restarts on round one", () => {
    const restarted = tutorialReducer(
      { status: "completed", correctRounds: 2, roundOutcomes: [{ result: "correct" }, { result: "correct" }] },
      { type: "restart" }
    );
    expect(restarted).toMatchObject({ status: "playing", roundIndex: 0, selectedChoiceId: null, answerSubmitted: false, correctRounds: 0 });
  });

  it("counts only the rounds confirmed as correct", () => {
    let state = tutorialReducer(initialTutorialState, { type: "start" });
    const answers = [true, false, true];
    for (const correct of answers) {
      state = tutorialReducer(state, { type: "select", choiceId: "choice" });
      state = tutorialReducer(state, { type: "submit", correct });
      state = tutorialReducer(state, { type: "next", totalRounds: answers.length });
    }
    expect(state).toEqual({
      status: "completed",
      correctRounds: 2,
      roundOutcomes: [{ result: "correct" }, { result: "incorrect" }, { result: "correct" }]
    });
  });
});

describe("what the reducer records for scoring", () => {
  function play(actions: TutorialAction[], totalRounds: number): TutorialState {
    let state = tutorialReducer(initialTutorialState, { type: "start" });
    for (const action of actions) {
      state = tutorialReducer(state, { type: "select", choiceId: "choice" });
      state = tutorialReducer(state, action);
      state = tutorialReducer(state, { type: "next", totalRounds });
    }
    return state;
  }

  it("keeps the timing of a timed answer so speed can be rewarded", () => {
    const state = play([{ type: "submit", correct: true, remainingMs: 8_000, durationMs: 10_000 }], 1);

    expect(state).toMatchObject({
      status: "completed",
      roundOutcomes: [{ result: "correct", remainingMs: 8_000, durationMs: 10_000 }]
    });
  });

  it("records an untimed answer without inventing a timing", () => {
    const state = play([{ type: "submit", correct: true }], 1);

    expect(state).toMatchObject({ status: "completed", roundOutcomes: [{ result: "correct" }] });
  });

  it("tells a wrong answer apart from letting the clock run out", () => {
    let state = tutorialReducer(initialTutorialState, { type: "start" });
    state = tutorialReducer(state, { type: "select", choiceId: "choice" });
    state = tutorialReducer(state, { type: "submit", correct: false });
    state = tutorialReducer(state, { type: "next", totalRounds: 2 });
    state = tutorialReducer(state, { type: "timeout" });
    state = tutorialReducer(state, { type: "next", totalRounds: 2 });

    expect(state).toEqual({
      status: "completed",
      correctRounds: 0,
      roundOutcomes: [{ result: "incorrect" }, { result: "timeout" }]
    });
  });

  it("records a timed-out round even though nothing was chosen", () => {
    const started = tutorialReducer(initialTutorialState, { type: "start" });
    const expired = tutorialReducer(started, { type: "timeout" });

    expect(expired).toMatchObject({ answerSubmitted: true, roundOutcomes: [{ result: "timeout" }] });
  });

  it("writes one outcome per round, however many times the round is confirmed", () => {
    const started = tutorialReducer(initialTutorialState, { type: "start" });
    const selected = tutorialReducer(started, { type: "select", choiceId: "choice" });
    const submitted = tutorialReducer(selected, { type: "submit", correct: true });
    const submittedTwice = tutorialReducer(submitted, { type: "submit", correct: true });
    const expiredAfterAnswer = tutorialReducer(submitted, { type: "timeout" });

    expect(submittedTwice).toBe(submitted);
    expect(expiredAfterAnswer).toBe(submitted);
    expect(submitted).toMatchObject({ correctRounds: 1, roundOutcomes: [{ result: "correct" }] });
  });

  it("records nothing for a round confirmed without a choice", () => {
    const started = tutorialReducer(initialTutorialState, { type: "start" });
    const submitted = tutorialReducer(started, { type: "submit", correct: true });

    expect(submitted).toBe(started);
  });

  it("starts a replay with no outcomes carried over", () => {
    const finished = play([{ type: "submit", correct: true }], 1);

    expect(tutorialReducer(finished, { type: "restart" })).toMatchObject({
      status: "playing",
      correctRounds: 0,
      roundOutcomes: []
    });
  });
});
