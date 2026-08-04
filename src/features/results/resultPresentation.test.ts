import { describe, expect, it } from "vitest";
import type { LevelResult } from "@/features/progress/progressState";
import { formatElapsedTime, getFreshResult, type DurationLabels } from "./resultPresentation";

const labels: DurationLabels = {
  second: "second",
  seconds: "seconds",
  minute: "minute",
  minutes: "minutes",
  join: "and",
  notRecorded: "Time not recorded"
};

const result: LevelResult = {
  levelId: "animals-1",
  attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
  correctRounds: 2,
  totalRounds: 3,
  elapsedMs: 72_000,
  completedAt: "2025-01-02T03:04:05.000Z"
};

describe("fresh result matching", () => {
  it("exposes a result only for its exact valid attempt id", () => {
    expect(getFreshResult(result, result.attemptId)).toBe(result);
  });

  it("does not expose a result for missing, empty, malformed, or mismatched attempts", () => {
    expect(getFreshResult(result, undefined)).toBeUndefined();
    expect(getFreshResult(result, "")).toBeUndefined();
    expect(getFreshResult(result, "not an attempt")).toBeUndefined();
    expect(getFreshResult(result, "attempt_abcdefab-cdef-abcd-efab-cdefabcdefab")).toBeUndefined();
  });

  it("does not expose legacy results with nullable attempt metadata", () => {
    expect(getFreshResult({ ...result, attemptId: null }, result.attemptId)).toBeUndefined();
  });

  it("makes an older result URL stale once a later completion replaces lastResult", () => {
    const latestResult = { ...result, attemptId: "attempt_abcdefab-cdef-abcd-efab-cdefabcdefab" };

    expect(getFreshResult(latestResult, result.attemptId)).toBeUndefined();
    expect(getFreshResult(latestResult, latestResult.attemptId)).toBe(latestResult);
  });
});

describe("elapsed-time formatting", () => {
  it("formats singular and plural seconds without raw milliseconds", () => {
    expect(formatElapsedTime(1_000, labels)).toBe("1 second");
    expect(formatElapsedTime(8_000, labels)).toBe("8 seconds");
  });

  it("formats singular and plural minutes with remaining seconds", () => {
    expect(formatElapsedTime(60_000, labels)).toBe("1 minute");
    expect(formatElapsedTime(72_000, labels)).toBe("1 minute and 12 seconds");
    expect(formatElapsedTime(121_000, labels)).toBe("2 minutes and 1 second");
  });

  it("uses honest fallback copy for missing or invalid elapsed time", () => {
    expect(formatElapsedTime(null, labels)).toBe("Time not recorded");
    expect(formatElapsedTime(-1, labels)).toBe("Time not recorded");
    expect(formatElapsedTime(Number.NaN, labels)).toBe("Time not recorded");
    expect(formatElapsedTime(Number.POSITIVE_INFINITY, labels)).toBe("Time not recorded");
    expect(formatElapsedTime(1.5, labels)).toBe("Time not recorded");
  });
});
