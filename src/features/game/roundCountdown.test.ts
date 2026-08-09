import { describe, expect, it } from "vitest";
import {
  createRoundDeadline,
  crossedFinalWarning,
  getCountdownProgress,
  getDisplayedRemainingSeconds,
  getRemainingMs,
  hasTimedOut,
  InitialNarrationCountdownGate,
  RoundClosureGuard
} from "./roundCountdown";

describe("round countdown deadlines", () => {
  it("creates one stable deadline and derives remaining time from it", () => {
    const deadline = createRoundDeadline("round-1", 1_000, 12_000)!;

    expect(deadline.deadlineMs).toBe(13_000);
    expect(getRemainingMs(deadline, 4_000)).toBe(9_000);
    expect(getRemainingMs(deadline, 20_000)).toBe(0);
  });

  it("creates a new deadline only for a new round identity", () => {
    const firstRound = createRoundDeadline("round-1", 1_000, 12_000)!;
    const secondRound = createRoundDeadline("round-2", 20_000, 12_000)!;

    expect(firstRound.roundId).toBe("round-1");
    expect(firstRound.deadlineMs).toBe(13_000);
    expect(secondRound.roundId).toBe("round-2");
    expect(secondRound.deadlineMs).toBe(32_000);
  });

  it("uses displayed-second rounding without extending the deadline", () => {
    const deadline = createRoundDeadline("round-1", 0, 12_000)!;

    expect(getDisplayedRemainingSeconds(getRemainingMs(deadline, 0))).toBe(12);
    expect(getDisplayedRemainingSeconds(getRemainingMs(deadline, 1_001))).toBe(11);
    expect(getDisplayedRemainingSeconds(getRemainingMs(deadline, 12_000))).toBe(0);
    expect(hasTimedOut(getRemainingMs(deadline, 20_000))).toBe(true);
  });

  it("clamps progress to the deadline range", () => {
    const deadline = createRoundDeadline("round-1", 100, 1_000)!;

    expect(getCountdownProgress(deadline, 0)).toBe(1);
    expect(getCountdownProgress(deadline, 600)).toBe(0.5);
    expect(getCountdownProgress(deadline, 2_000)).toBe(0);
  });

  it("signals the five-second warning only when its threshold is crossed", () => {
    expect(crossedFinalWarning(6_000, 5_000)).toBe(true);
    expect(crossedFinalWarning(5_000, 4_000)).toBe(false);
    expect(crossedFinalWarning(null, 5_000)).toBe(true);
    expect(crossedFinalWarning(6_000, 0)).toBe(false);
  });

  it("does not create a deadline for untimed rounds", () => {
    expect(createRoundDeadline("round-1", 0, undefined)).toBeNull();
    expect(createRoundDeadline("round-1", 0, 0.5)).toBeNull();
  });

  it("allows either an answer or timeout to close a round, but never both", () => {
    const closure = new RoundClosureGuard();
    closure.startRound("round-1");

    expect(closure.tryClose("round-1")).toBe(true); // Answer wins the race.
    expect(closure.tryClose("round-1")).toBe(false); // Timeout is ignored.
    expect(closure.isClosed("round-1")).toBe(true);
  });

  it("allows the timeout to win and opens the guard for the next round", () => {
    const closure = new RoundClosureGuard();
    closure.startRound("round-1");

    expect(closure.tryClose("round-1")).toBe(true); // Timeout wins the race.
    expect(closure.tryClose("round-1")).toBe(false); // A later answer is ignored.

    closure.startRound("round-2");
    expect(closure.tryClose("round-2")).toBe(true);
  });
});

describe("initial narration countdown gate", () => {
  it("starts a timed round immediately when narration is disabled or unavailable", () => {
    const gate = new InitialNarrationCountdownGate();

    expect(gate.prepare("round-1", false)).toBe(true);
    expect(gate.hasStarted("round-1")).toBe(true);
  });

  it("waits for initial narration, then opens with a full new deadline", () => {
    const gate = new InitialNarrationCountdownGate();

    expect(gate.prepare("round-1", true)).toBe(false);
    expect(gate.hasStarted("round-1")).toBe(false);
    expect(gate.start("round-1")).toBe(true);
    expect(createRoundDeadline("round-1", 5_000, 12_000)?.deadlineMs).toBe(17_000);
  });

  it("lets the first interaction open the timer and cannot extend it afterwards", () => {
    const gate = new InitialNarrationCountdownGate();
    gate.prepare("round-1", true);

    expect(gate.start("round-1")).toBe(true);
    expect(gate.start("round-1")).toBe(false);
    const deadline = createRoundDeadline("round-1", 2_000, 12_000)!;
    expect(getRemainingMs(deadline, 4_000)).toBe(10_000);
  });

  it("resets for the next round without giving untimed rounds a deadline", () => {
    const gate = new InitialNarrationCountdownGate();
    gate.prepare("round-1", true);
    gate.start("round-1");

    expect(gate.prepare("round-2", true)).toBe(false);
    expect(gate.hasStarted("round-2")).toBe(false);
    expect(createRoundDeadline("round-2", 0, undefined)).toBeNull();
  });
});
