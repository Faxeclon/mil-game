import { describe, expect, it } from "vitest";
import { completeLevel, initialProgressState, type LevelAttempt, type ProgressState } from "@/features/progress/progressState";
import { getContinueDestination, getSectionCompletionEvent } from "./levelProgress";
import type { LevelId } from "./levelModel";

function attempt(index: number): LevelAttempt {
  return {
    attemptId: `attempt_section-${index.toString().padStart(8, "0")}`,
    correctRounds: 1,
    totalRounds: 1,
    elapsedMs: 1,
    completedAt: "2026-08-09T00:00:00.000Z"
  };
}

function play(ids: readonly LevelId[]): ProgressState {
  return ids.reduce((state, id, index) => completeLevel(state, id, attempt(index)), initialProgressState);
}

describe("section completion events", () => {
  it("detects the last pending mission of a section", () => {
    const state = play(["basics-1", "basics-2"]);
    expect(getSectionCompletionEvent(state, "basics-2")).toMatchObject({ categoryKey: "basics", islandCompleted: true });
  });

  it("does not create an event for an intermediate mission", () => {
    const state = play(["basics-1"]);
    expect(getSectionCompletionEvent(state, "basics-1")).toBeNull();
  });

  it("returns to the same island when a completed section leaves other sections", () => {
    const state = play(["basics-1", "basics-2", "animals-1", "animals-2", "animals-3"]);
    expect(getSectionCompletionEvent(state, "animals-3")).toEqual({
      categoryKey: "animals", islandKey: "difference", completionAttemptId: "attempt_section-00000004", islandCompleted: false,
      destination: { kind: "island", islandKey: "difference" }
    });
    expect(getContinueDestination(state, "animals-3")).toEqual({ kind: "island", islandKey: "difference" });
  });

  it("returns to the general map when the last required section closes an island", () => {
    const state = play(["basics-1", "basics-2", "animals-1", "animals-2", "animals-3", "sports-1", "sports-2", "memes-1", "memes-2"]);
    expect(getSectionCompletionEvent(state, "memes-2")).toMatchObject({ categoryKey: "memes", islandCompleted: true, destination: { kind: "worlds" } });
    expect(getContinueDestination(state, "memes-2")).toEqual({ kind: "worlds" });
  });

  it("does not create another event by replaying only a section's final mission", () => {
    const finished = play(["basics-1", "basics-2"]);
    const replayed = completeLevel(finished, "basics-2", attempt(9));
    expect(getSectionCompletionEvent(replayed, "basics-2")).toBeNull();
    expect(replayed.completedLevelIds).toEqual(finished.completedLevelIds);
  });

  it("creates one new event after replaying every mission in normal order", () => {
    const finished = play(["basics-1", "basics-2"]);
    const replayFirst = completeLevel(finished, "basics-1", attempt(10));
    const replayed = completeLevel(replayFirst, "basics-2", attempt(11));
    expect(getSectionCompletionEvent(replayed, "basics-2")).toMatchObject({ categoryKey: "basics" });
    expect(replayed.completedLevelIds).toEqual(finished.completedLevelIds);
  });

  it("consumes the replay event so repeating the final mission cannot create another one", () => {
    const finished = play(["basics-1", "basics-2"]);
    const replayed = completeLevel(completeLevel(finished, "basics-1", attempt(12)), "basics-2", attempt(13));
    const repeatedFinal = completeLevel(replayed, "basics-2", attempt(14));
    expect(getSectionCompletionEvent(repeatedFinal, "basics-2")).toBeNull();
    expect(repeatedFinal.completedLevelIds).toEqual(finished.completedLevelIds);
  });
});
