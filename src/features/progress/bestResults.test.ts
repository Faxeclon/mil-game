import { describe, expect, it } from "vitest";
import {
  getBestResult,
  isBetterThanRecord,
  isNewRecord,
  parseBestResults,
  updateBestResults,
  type BestResult
} from "./bestResults";
import { completeLevel, initialProgressState, type LevelAttempt } from "./progressState";

const attemptId = "attempt_123e4567-e89b-12d3-a456-426614174000";
const otherAttemptId = "attempt_223e4567-e89b-12d3-a456-426614174000";

const record: BestResult = {
  score: 800,
  correctRounds: 2,
  totalRounds: 3,
  elapsedMs: 10_000,
  attemptId,
  completedAt: "2025-01-02T03:04:05.000Z"
};

function attempt(overrides: Partial<LevelAttempt> = {}): LevelAttempt {
  return {
    attemptId,
    correctRounds: 3,
    totalRounds: 3,
    elapsedMs: 5_000,
    completedAt: "2025-01-02T03:04:05.000Z",
    score: 900,
    ...overrides
  };
}

describe("deciding the record", () => {
  it("takes the record when there is none yet", () => {
    expect(isBetterThanRecord({ ...record, score: 1 }, undefined)).toBe(true);
  });

  it("takes the record only for a higher score", () => {
    expect(isBetterThanRecord({ ...record, score: 801 }, record)).toBe(true);
    expect(isBetterThanRecord({ ...record, score: 799 }, record)).toBe(false);
  });

  it("breaks a tie by more correct answers first", () => {
    expect(isBetterThanRecord({ ...record, correctRounds: 3 }, record)).toBe(true);
    expect(isBetterThanRecord({ ...record, correctRounds: 1 }, record)).toBe(false);
  });

  it("then breaks a tie by the quicker run", () => {
    expect(isBetterThanRecord({ ...record, elapsedMs: 9_999 }, record)).toBe(true);
    expect(isBetterThanRecord({ ...record, elapsedMs: 10_001 }, record)).toBe(false);
  });

  it("keeps the existing record on a full tie, so a newer run never wins by being newer", () => {
    expect(isBetterThanRecord({ ...record, attemptId: otherAttemptId }, record)).toBe(false);
  });

  it("does not let a run without a measured time claim to be faster", () => {
    expect(isBetterThanRecord({ ...record, elapsedMs: null }, record)).toBe(false);
    expect(isBetterThanRecord(record, { ...record, elapsedMs: null })).toBe(true);
  });
});

describe("updating the records", () => {
  it("stores the first attempt as the record", () => {
    const records = updateBestResults({}, "basics-1", record);
    expect(getBestResult(records, "basics-1")?.score).toBe(800);
  });

  it("returns the same object when nothing improved, so nothing re-renders", () => {
    const records = updateBestResults({}, "basics-1", record);
    expect(updateBestResults(records, "basics-1", { ...record, score: 500 })).toBe(records);
  });

  it("rejects a level that does not exist", () => {
    const records = updateBestResults({}, "ghost-level" as never, record);
    expect(records).toEqual({});
  });

  it("keeps one record per level, never a running total", () => {
    let records = updateBestResults({}, "basics-1", record);
    records = updateBestResults(records, "basics-1", { ...record, score: 900, attemptId: otherAttemptId });
    expect(Object.keys(records)).toEqual(["basics-1"]);
    expect(records["basics-1"]?.score).toBe(900);
  });

  it("recognises the attempt that currently holds the record", () => {
    const records = updateBestResults({}, "basics-1", record);
    expect(isNewRecord(records, "basics-1", attemptId)).toBe(true);
    expect(isNewRecord(records, "basics-1", otherAttemptId)).toBe(false);
    expect(isNewRecord(records, "basics-1", null)).toBe(false);
  });
});

describe("reading stored records", () => {
  it("keeps a valid entry and drops unknown levels", () => {
    const records = parseBestResults({ "basics-1": record, "ghost-level": record });
    expect(Object.keys(records)).toEqual(["basics-1"]);
  });

  it("drops entries without a usable score instead of inventing one", () => {
    expect(parseBestResults({ "basics-1": { ...record, score: undefined } })).toEqual({});
    expect(parseBestResults({ "basics-1": { ...record, totalRounds: 0 } })).toEqual({});
  });

  it("survives corrupt data without throwing", () => {
    expect(parseBestResults(undefined)).toEqual({});
    expect(parseBestResults("not-an-object")).toEqual({});
    expect(parseBestResults({ "basics-1": "broken" })).toEqual({});
  });
});

describe("records and completion stay separate", () => {
  it("saves the record alongside the completion when an attempt has a score", () => {
    const state = completeLevel(initialProgressState, "basics-1", attempt());

    expect(state.completedLevelIds).toEqual(["basics-1"]);
    expect(state.bestResultsByLevelId["basics-1"]?.score).toBe(900);
    expect(state.lastResult?.score).toBe(900);
  });

  it("replays without ever losing the best run", () => {
    const first = completeLevel(initialProgressState, "basics-1", attempt());
    const worse = completeLevel(first, "basics-1", attempt({ attemptId: otherAttemptId, score: 300 }));

    expect(worse.bestResultsByLevelId["basics-1"]?.score).toBe(900);
    expect(worse.lastResult?.score).toBe(300);
    expect(worse.completedLevelIds).toEqual(["basics-1"]);
  });

  it("completes a level even when the attempt carries no score", () => {
    const state = completeLevel(initialProgressState, "basics-1", attempt({ score: undefined }));

    expect(state.completedLevelIds).toEqual(["basics-1"]);
    expect(state.lastResult?.score).toBeNull();
    expect(state.bestResultsByLevelId).toEqual({});
  });

  it("never lets a record unlock a level on its own", () => {
    const records = updateBestResults({}, "animals-1", record);
    const state = { ...initialProgressState, bestResultsByLevelId: records };

    expect(state.completedLevelIds).toEqual([]);
  });
});
