export type RoundDeadline = {
  roundId: string;
  durationMs: number;
  deadlineMs: number;
};

const FINAL_WARNING_MS = 5_000;

export class RoundClosureGuard {
  private activeRoundId: string | null = null;
  private isActiveRoundClosed = false;

  startRound(roundId: string): void {
    if (this.activeRoundId === roundId) return;
    this.activeRoundId = roundId;
    this.isActiveRoundClosed = false;
  }

  tryClose(roundId: string): boolean {
    if (this.activeRoundId === null) this.startRound(roundId);
    if (this.activeRoundId !== roundId || this.isActiveRoundClosed) return false;
    this.isActiveRoundClosed = true;
    return true;
  }

  isClosed(roundId: string): boolean {
    return this.activeRoundId === roundId && this.isActiveRoundClosed;
  }
}

export function createRoundDeadline(
  roundId: string,
  startedAtMs: number,
  durationMs: number | undefined
): RoundDeadline | null {
  const normalizedDurationMs = Math.trunc(durationMs ?? 0);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(durationMs) || normalizedDurationMs <= 0) return null;
  return {
    roundId,
    durationMs: normalizedDurationMs,
    deadlineMs: startedAtMs + normalizedDurationMs
  };
}

export function getRemainingMs(deadline: RoundDeadline, nowMs: number): number {
  if (!Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.trunc(deadline.deadlineMs - nowMs));
}

export function getDisplayedRemainingSeconds(remainingMs: number): number {
  return Math.max(0, Math.ceil(remainingMs / 1_000));
}

export function getCountdownProgress(deadline: RoundDeadline, nowMs: number): number {
  return Math.min(1, Math.max(0, getRemainingMs(deadline, nowMs) / deadline.durationMs));
}

export function crossedFinalWarning(previousRemainingMs: number | null, remainingMs: number): boolean {
  return (
    remainingMs > 0 &&
    remainingMs <= FINAL_WARNING_MS &&
    (previousRemainingMs === null || previousRemainingMs > FINAL_WARNING_MS)
  );
}

export function hasTimedOut(remainingMs: number): boolean {
  return remainingMs <= 0;
}
