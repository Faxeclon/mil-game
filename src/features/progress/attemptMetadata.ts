import { getLocalPlayedOn } from "./streak";

export type AttemptIdDependencies = {
  randomUUID?: (() => string) | null;
  getRandomValues?: ((values: Uint32Array) => Uint32Array) | null;
  now?: () => number;
};

const ATTEMPT_ID_MAX_LENGTH = 128;
const attemptIdPattern = /^attempt_[a-z0-9]+(?:-[a-z0-9]+)*$/i;
let fallbackSequence = 0;

/** Checks the URL-safe identifier used to distinguish one completed attempt from another. */
export function isAttemptId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 16 &&
    value.length <= ATTEMPT_ID_MAX_LENGTH &&
    attemptIdPattern.test(value)
  );
}

function getCrypto(): Crypto | undefined {
  return typeof globalThis.crypto === "undefined" ? undefined : globalThis.crypto;
}

/** Creates a testable, URL-safe attempt identifier without requiring a dependency. */
export function createAttemptId(dependencies: AttemptIdDependencies = {}): string {
  const crypto = getCrypto();
  const randomUUID = dependencies.randomUUID === undefined
    ? (dependencies.getRandomValues === undefined ? crypto?.randomUUID?.bind(crypto) : undefined)
    : dependencies.randomUUID;
  if (randomUUID) {
    const attemptId = `attempt_${randomUUID()}`;
    if (isAttemptId(attemptId)) return attemptId;
  }

  const getRandomValues = dependencies.getRandomValues === undefined
    ? crypto?.getRandomValues?.bind(crypto)
    : dependencies.getRandomValues;
  if (getRandomValues) {
    const values = getRandomValues(new Uint32Array(2));
    return `attempt_${values[0].toString(16).padStart(8, "0")}${values[1].toString(16).padStart(8, "0")}`;
  }

  // Very old browsers without Web Crypto still receive a session-unique, URL-safe id.
  fallbackSequence += 1;
  const timestamp = dependencies.now?.() ?? Date.now();
  const normalizedTimestamp = Number.isFinite(timestamp) && timestamp >= 0 ? Math.trunc(timestamp) : 0;
  const safeTimestamp = Number.isSafeInteger(normalizedTimestamp) ? normalizedTimestamp : 0;
  return `attempt_${safeTimestamp.toString(36).padStart(8, "0")}-${fallbackSequence.toString(36).padStart(8, "0")}`;
}

/**
 * Creates the metadata attached to a newly completed attempt.
 *
 * `completedAt` is the instant, in UTC; `playedOn` is the calendar day the child was
 * living when they finished. Both are recorded because a streak follows the local day
 * and would otherwise jump a day for anyone playing in the evening.
 */
export function createAttemptMetadata(
  dependencies: AttemptIdDependencies = {}
): { attemptId: string; completedAt: string; playedOn?: string } {
  const finishedAt = new Date(dependencies.now?.() ?? Date.now());
  const playedOn = getLocalPlayedOn(finishedAt);
  return {
    attemptId: createAttemptId(dependencies),
    completedAt: finishedAt.toISOString(),
    ...(playedOn ? { playedOn } : {})
  };
}

export function parseElapsedMs(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
}

export function parseCompletedAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    return date.toISOString();
  } catch {
    return null;
  }
}
