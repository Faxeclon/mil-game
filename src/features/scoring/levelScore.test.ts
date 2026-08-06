import { describe, expect, it } from "vitest";
import {
  calculateLevelScore,
  getSpeedFactor,
  getStarCount,
  isLevelScore,
  MAX_LEVEL_SCORE,
  parseLevelScore,
  ROUND_SCORE,
  scoreRound,
  STAR_THRESHOLDS,
  type RoundOutcome
} from "./levelScore";

const timedCorrectFast: RoundOutcome = { result: "correct", remainingMs: 15_000, durationMs: 15_000 };
const timedCorrectSlow: RoundOutcome = { result: "correct", remainingMs: 0, durationMs: 15_000 };
const untimedCorrect: RoundOutcome = { result: "correct" };
const incorrect: RoundOutcome = { result: "incorrect" };
const timedOut: RoundOutcome = { result: "timeout" };

describe("scoring one round", () => {
  it("gives full marks for a correct answer with no clock", () => {
    expect(scoreRound(untimedCorrect)).toBe(ROUND_SCORE.untimedCorrect);
    expect(scoreRound({ result: "correct", durationMs: 0 })).toBe(ROUND_SCORE.untimedCorrect);
  });

  it("adds speed on top of accuracy, never instead of it", () => {
    expect(scoreRound(timedCorrectFast)).toBe(ROUND_SCORE.timedCorrectBase + ROUND_SCORE.timedSpeedBonus);
    expect(scoreRound(timedCorrectSlow)).toBe(ROUND_SCORE.timedCorrectBase);
    expect(scoreRound({ result: "correct", remainingMs: 7_500, durationMs: 15_000 })).toBe(
      ROUND_SCORE.timedCorrectBase + ROUND_SCORE.timedSpeedBonus / 2
    );
  });

  it("scores a wrong answer very low, and a timeout lower still", () => {
    expect(scoreRound(incorrect)).toBe(ROUND_SCORE.incorrect);
    expect(scoreRound(timedOut)).toBe(ROUND_SCORE.timeout);
    expect(scoreRound(timedOut)).toBeLessThan(scoreRound(incorrect));
  });

  it("never lets a quick wrong answer beat a slow correct one", () => {
    expect(scoreRound(incorrect)).toBeLessThan(scoreRound(timedCorrectSlow));
    expect(scoreRound(timedOut)).toBeLessThan(scoreRound(timedCorrectSlow));
  });

  it("treats impossible or missing timings as no speed bonus, not as a penalty", () => {
    for (const round of [
      { result: "correct", remainingMs: Number.NaN, durationMs: 15_000 },
      { result: "correct", remainingMs: -500, durationMs: 15_000 },
      { result: "correct", durationMs: 15_000 }
    ] as RoundOutcome[]) {
      expect(scoreRound(round)).toBe(ROUND_SCORE.timedCorrectBase);
    }
  });

  it("caps the bonus when more time is reported than the round allowed", () => {
    expect(scoreRound({ result: "correct", remainingMs: 99_000, durationMs: 15_000 })).toBe(
      ROUND_SCORE.timedCorrectBase + ROUND_SCORE.timedSpeedBonus
    );
  });

  it("ignores an impossible duration rather than dividing by it", () => {
    expect(getSpeedFactor(5_000, 0)).toBe(0);
    expect(getSpeedFactor(5_000, Number.NaN)).toBe(0);
    expect(getSpeedFactor(5_000, -1)).toBe(0);
  });
});

describe("scoring an attempt", () => {
  it("is the average of its rounds on the shared scale", () => {
    expect(calculateLevelScore([untimedCorrect, untimedCorrect, untimedCorrect])).toBe(MAX_LEVEL_SCORE);
    expect(calculateLevelScore([timedCorrectSlow, timedCorrectSlow])).toBe(ROUND_SCORE.timedCorrectBase);
    expect(calculateLevelScore([untimedCorrect, incorrect])).toBe(
      Math.round((ROUND_SCORE.untimedCorrect + ROUND_SCORE.incorrect) / 2)
    );
  });

  it("stays inside the scale and never goes negative", () => {
    const score = calculateLevelScore([timedOut, incorrect, timedCorrectFast]);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(MAX_LEVEL_SCORE);
    expect(Number.isInteger(score)).toBe(true);
  });

  it("returns zero for an attempt with no rounds instead of dividing by nothing", () => {
    expect(calculateLevelScore([])).toBe(0);
  });

  it("is deterministic: the same rounds always give the same score", () => {
    const rounds = [timedCorrectFast, incorrect, timedCorrectSlow];
    expect(calculateLevelScore(rounds)).toBe(calculateLevelScore(rounds));
  });

  it("rewards more correct answers over faster wrong ones", () => {
    const twoCorrectSlow = calculateLevelScore([timedCorrectSlow, timedCorrectSlow, timedCorrectSlow]);
    const oneCorrectFast = calculateLevelScore([timedCorrectFast, incorrect, incorrect]);
    expect(twoCorrectSlow).toBeGreaterThan(oneCorrectFast);
  });

  it("does not penalise a mission that has no timer at all", () => {
    const untimedPerfect = calculateLevelScore([untimedCorrect, untimedCorrect]);
    const timedPerfect = calculateLevelScore([timedCorrectFast, timedCorrectFast]);
    expect(untimedPerfect).toBeGreaterThanOrEqual(timedPerfect);
  });
});

describe("stars", () => {
  it("awards a star per threshold reached", () => {
    expect(getStarCount(0)).toBe(0);
    expect(getStarCount(STAR_THRESHOLDS[0])).toBe(1);
    expect(getStarCount(STAR_THRESHOLDS[1])).toBe(2);
    expect(getStarCount(STAR_THRESHOLDS[2])).toBe(3);
    expect(getStarCount(MAX_LEVEL_SCORE)).toBe(3);
  });

  it("awards nothing for a value that is not a real score", () => {
    expect(getStarCount(Number.NaN)).toBe(0);
  });
});

describe("reading a stored score", () => {
  it("accepts a whole number inside the scale", () => {
    expect(isLevelScore(0)).toBe(true);
    expect(isLevelScore(MAX_LEVEL_SCORE)).toBe(true);
    expect(isLevelScore(-1)).toBe(false);
    expect(isLevelScore(MAX_LEVEL_SCORE + 1)).toBe(false);
    expect(isLevelScore(840.5)).toBe(false);
    expect(isLevelScore("840")).toBe(false);
  });

  it("clamps a stored value onto the scale, and reports a missing one honestly", () => {
    expect(parseLevelScore(840)).toBe(840);
    expect(parseLevelScore(840.6)).toBe(841);
    expect(parseLevelScore(-20)).toBe(0);
    expect(parseLevelScore(5_000)).toBe(MAX_LEVEL_SCORE);
    expect(parseLevelScore(undefined)).toBeNull();
    expect(parseLevelScore("840")).toBeNull();
    expect(parseLevelScore(Number.NaN)).toBeNull();
  });
});
