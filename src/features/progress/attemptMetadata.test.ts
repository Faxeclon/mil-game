import { describe, expect, it } from "vitest";
import {
  createAttemptId,
  createAttemptMetadata,
  isAttemptId,
  parseCompletedAt,
  parseElapsedMs
} from "./attemptMetadata";

describe("attempt metadata", () => {
  it("creates a valid deterministic attempt id when a UUID source is supplied", () => {
    const attemptId = createAttemptId({ randomUUID: () => "123e4567-e89b-12d3-a456-426614174000" });

    expect(attemptId).toBe("attempt_123e4567-e89b-12d3-a456-426614174000");
    expect(isAttemptId(attemptId)).toBe(true);
  });

  it("uses random values when randomUUID is unavailable", () => {
    const attemptId = createAttemptId({
      randomUUID: null,
      getRandomValues: (values) => {
        values[0] = 1;
        values[1] = 2;
        return values;
      }
    });

    expect(attemptId).toBe("attempt_0000000100000002");
    expect(isAttemptId(attemptId)).toBe(true);
  });

  it("rejects malformed, empty, overly long, and control-character attempt ids", () => {
    expect(isAttemptId("")).toBe(false);
    expect(isAttemptId("not-an-attempt")).toBe(false);
    expect(isAttemptId("attempt_bad\nvalue")).toBe(false);
    expect(isAttemptId(`attempt_${"a".repeat(129)}`)).toBe(false);
  });

  it("does not return an invalid injected UUID", () => {
    const attemptId = createAttemptId({
      randomUUID: () => "not a safe id",
      getRandomValues: (values) => {
        values[0] = 1;
        values[1] = 2;
        return values;
      }
    });

    expect(attemptId).toBe("attempt_0000000100000002");
  });

  it("creates validator-safe fallback ids for negative and invalid injected timestamps", () => {
    const fallback = { randomUUID: null, getRandomValues: null } as const;

    expect(isAttemptId(createAttemptId({ ...fallback, now: () => -1 }))).toBe(true);
    expect(isAttemptId(createAttemptId({ ...fallback, now: () => Number.NaN }))).toBe(true);
    expect(isAttemptId(createAttemptId({ ...fallback, now: () => Number.POSITIVE_INFINITY }))).toBe(true);
    expect(isAttemptId(createAttemptId({ ...fallback, now: () => Number.MAX_VALUE }))).toBe(true);
  });

  it("keeps fallback ids unique within the module session", () => {
    const fallback = { randomUUID: null, getRandomValues: null, now: () => 0 } as const;
    const first = createAttemptId(fallback);
    const second = createAttemptId(fallback);

    expect(first).not.toBe(second);
    expect(isAttemptId(first)).toBe(true);
    expect(isAttemptId(second)).toBe(true);
  });

  it("creates a valid ISO completion timestamp from an injected time source", () => {
    expect(createAttemptMetadata({
      randomUUID: () => "123e4567-e89b-12d3-a456-426614174000",
      now: () => 0
    })).toEqual({
      attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
      completedAt: "1970-01-01T00:00:00.000Z"
    });
  });

  it("normalizes elapsed milliseconds and safely drops invalid metadata", () => {
    expect(parseElapsedMs(12.9)).toBe(12);
    expect(parseElapsedMs(0)).toBe(0);
    expect(parseElapsedMs(-1)).toBeNull();
    expect(parseElapsedMs(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseElapsedMs(Number.NaN)).toBeNull();
    expect(parseCompletedAt("2025-01-02T03:04:05.000Z")).toBe("2025-01-02T03:04:05.000Z");
    expect(parseCompletedAt("not-a-date")).toBeNull();
  });
});
