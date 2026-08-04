import { isAttemptId } from "@/features/progress/attemptMetadata";
import type { LevelResult } from "@/features/progress/progressState";

export type DurationLabels = {
  second: string;
  seconds: string;
  minute: string;
  minutes: string;
  join: string;
  notRecorded: string;
};

/** Returns only the latest persisted result, and only for its exact valid URL attempt. */
export function getFreshResult(
  lastResult: LevelResult | undefined,
  requestedAttemptId: string | null | undefined
): LevelResult | undefined {
  if (!isAttemptId(requestedAttemptId) || !lastResult?.attemptId) return undefined;
  return lastResult.attemptId === requestedAttemptId ? lastResult : undefined;
}

/** Formats recorded active-answer time without inventing a value for missing metadata. */
export function formatElapsedTime(elapsedMs: number | null, labels: DurationLabels): string {
  if (
    elapsedMs === null ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    !Number.isInteger(elapsedMs)
  ) {
    return labels.notRecorded;
  }

  const totalSeconds = Math.floor(elapsedMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const secondsText = `${seconds} ${seconds === 1 ? labels.second : labels.seconds}`;

  if (minutes === 0) return secondsText;
  const minutesText = `${minutes} ${minutes === 1 ? labels.minute : labels.minutes}`;
  return seconds === 0 ? minutesText : `${minutesText} ${labels.join} ${secondsText}`;
}
