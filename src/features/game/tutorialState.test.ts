import { describe, expect, it } from "vitest";
import { initialTutorialState, tutorialReducer } from "./tutorialState";

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
    expect(state).toEqual({ status: "completed", correctRounds: 0 });
  });

  it("restarts on round one", () => {
    const restarted = tutorialReducer({ status: "completed", correctRounds: 2 }, { type: "restart" });
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
    expect(state).toEqual({ status: "completed", correctRounds: 2 });
  });
});
