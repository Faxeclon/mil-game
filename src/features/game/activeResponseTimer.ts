/** Accumulates only the time a player can actively answer tutorial rounds. */
export class ActiveResponseTimer {
  private elapsed = 0;
  private activeRound: { id: string; startedAt: number } | null = null;

  startRound(roundId: string, startedAt: number): void {
    if (!Number.isFinite(startedAt) || this.activeRound) return;
    this.activeRound = { id: roundId, startedAt };
  }

  finishRound(roundId: string, finishedAt: number): void {
    if (!this.activeRound || this.activeRound.id !== roundId || !Number.isFinite(finishedAt)) return;
    this.elapsed += Math.max(0, Math.trunc(finishedAt - this.activeRound.startedAt));
    this.activeRound = null;
  }

  finishTimedOutRound(roundId: string, configuredDurationMs: number): void {
    if (!this.activeRound || this.activeRound.id !== roundId) return;
    if (Number.isFinite(configuredDurationMs) && configuredDurationMs >= 0) {
      this.elapsed += Math.trunc(configuredDurationMs);
    }
    this.activeRound = null;
  }

  getElapsedMs(): number {
    return Number.isFinite(this.elapsed) && this.elapsed >= 0 ? Math.trunc(this.elapsed) : 0;
  }
}
