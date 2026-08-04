import { describe, expect, it } from "vitest";
import { ActiveResponseTimer } from "./activeResponseTimer";

describe("active response timer", () => {
  it("counts only active answer time, excluding time before and after a round", () => {
    const timer = new ActiveResponseTimer();
    timer.finishRound("round-1", 100); // Intro time is never active.
    timer.startRound("round-1", 100);
    timer.finishRound("round-1", 340);
    timer.finishRound("round-1", 900); // Feedback time is already closed.

    expect(timer.getElapsedMs()).toBe(240);
  });

  it("records a timed out round as the configured full duration", () => {
    const timer = new ActiveResponseTimer();
    timer.startRound("round-1", 100);
    timer.finishTimedOutRound("round-1", 15_000);

    expect(timer.getElapsedMs()).toBe(15_000);
  });

  it("does not add a round twice when completion is duplicated", () => {
    const timer = new ActiveResponseTimer();
    timer.startRound("round-1", 100);
    timer.finishRound("round-1", 400);
    timer.finishTimedOutRound("round-1", 15_000);
    timer.finishRound("round-1", 500);

    expect(timer.getElapsedMs()).toBe(300);
  });

  it("accumulates multiple answerable rounds", () => {
    const timer = new ActiveResponseTimer();
    timer.startRound("round-1", 10);
    timer.finishRound("round-1", 110);
    timer.startRound("round-2", 200);
    timer.finishRound("round-2", 550);
    timer.startRound("round-3", 700);
    timer.finishTimedOutRound("round-3", 1_000);

    expect(timer.getElapsedMs()).toBe(1_450);
  });
});
