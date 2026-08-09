import type { RushState } from "./rushState";

export const SHIELD_FEEDBACK_MS = 900;

/** A UI-only transition: persisted shield state must never replay this on refresh. */
export function isShieldActivation(previous: RushState, next: RushState): boolean {
  return previous.status === "playing" &&
    next.status === "playing" &&
    !previous.shieldUsed &&
    next.shieldUsed &&
    next.lastAnswer === "shield";
}
