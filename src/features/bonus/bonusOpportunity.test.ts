import { describe, expect, it } from "vitest";
import { initialProgressState, parseProgressState, resetProgressKeepingProfile } from "@/features/progress/progressState";
import { activateBonusOpportunity, bonusWheelSegments, chooseBonusWheelSegment, consumeBonusOpportunity, createBonusOpportunity, getActiveBonus, getActiveBonusForIsland, getBonusDestinationPath, getBonusOpportunityId, getPendingBonus, spinBonusWheel, startBonusRushRun, updateBonusRushRun } from "./bonusOpportunity";

const first = { id: "animals:attempt-1", categoryKey: "animals" as const, islandKey: "difference" as const, destination: { kind: "island" as const, islandKey: "difference" as const } };
const second = { id: "animals:attempt-2", categoryKey: "animals" as const, islandKey: "difference" as const, destination: { kind: "worlds" as const } };
const rushRun = {
  runId: "animals:attempt-1:run",
  startedAt: 1_000,
  deckItemIds: ["animals-1-r1-ai", "animals-1-r1-real"],
  index: 1,
  correct: 1,
  wrong: 0,
  finished: false,
  ranOut: false
};

describe("per-profile bonus opportunities", () => {
  it("normalizes older saved progress without bonus data to an empty list", () => {
    const restored = parseProgressState({ ...initialProgressState, bonusOpportunities: undefined, completedLevelIds: ["basics-1"] });
    expect(restored.completedLevelIds).toEqual(["basics-1"]);
    expect(restored.bonusOpportunities).toEqual([]);
  });
  it("clears opportunities during reset while preserving identity and guardian", () => {
    const state = createBonusOpportunity({ ...initialProgressState, localNickname: "Roqui", guardian: { email: "adult@example.com", authorizedOn: "2026-08-09", syncPending: true } }, first);
    const reset = resetProgressKeepingProfile(state);
    expect(reset.bonusOpportunities).toEqual([]);
    expect(reset.localNickname).toBe("Roqui");
    expect(reset.guardian).toEqual(state.guardian);
  });
  it("uses a stable completion-event id and a new id for a later replay", () => {
    expect(getBonusOpportunityId("animals", "attempt-1")).toBe(getBonusOpportunityId("animals", "attempt-1"));
    expect(getBonusOpportunityId("animals", "attempt-1")).not.toBe(getBonusOpportunityId("animals", "attempt-2"));
  });
  it("keeps the section's already calculated destination for declining the offer", () => {
    expect(getBonusDestinationPath(first.destination)).toBe("/island/difference");
    expect(getBonusDestinationPath(second.destination)).toBe("/worlds");
  });
  it("creates one pending opportunity per completion event and survives a refresh", () => {
    const pending = createBonusOpportunity(initialProgressState, first);
    expect(createBonusOpportunity(pending, first)).toBe(pending);
    expect(getPendingBonus(parseProgressState(JSON.parse(JSON.stringify(pending))))).toMatchObject(first);
  });
  it("activates exactly once and keeps consumed opportunities consumed", () => {
    const pending = createBonusOpportunity(initialProgressState, first);
    const active = activateBonusOpportunity(pending, first.id);
    expect(activateBonusOpportunity(active, first.id)).toBe(active);
    expect(getActiveBonus(active)).toMatchObject(first);
    const consumed = consumeBonusOpportunity(active, first.id);
    expect(getPendingBonus(consumed)).toBeUndefined();
    expect(consumeBonusOpportunity(consumed, first.id)).toBe(consumed);
  });
  it("admits Rush only for the active opportunity's island", () => {
    const active = activateBonusOpportunity(createBonusOpportunity(initialProgressState, first), first.id);
    expect(getActiveBonusForIsland(active, "difference")).toMatchObject(first);
    expect(getActiveBonusForIsland(active, "training")).toBeUndefined();
    expect(getActiveBonusForIsland(consumeBonusOpportunity(active, first.id), "difference")).toBeUndefined();
  });
  it("does not treat a legacy Rush unlock as an active Bonus", () => {
    expect(getActiveBonusForIsland({ ...initialProgressState, rushUnlockedIslands: ["difference"] }, "difference")).toBeUndefined();
  });
  it("persists one started run with its deck and progress across refresh", () => {
    const active = activateBonusOpportunity(createBonusOpportunity(initialProgressState, first), first.id);
    const started = startBonusRushRun(active, first.id, rushRun);
    const restored = parseProgressState(JSON.parse(JSON.stringify(started)));

    expect(restored.bonusOpportunities[0]?.rushRun).toEqual(rushRun);
    expect(startBonusRushRun(restored, first.id, { ...rushRun, runId: "second-run" })).toBe(restored);
  });
  it("updates only the active run, without touching normal progress", () => {
    const active = activateBonusOpportunity(createBonusOpportunity({ ...initialProgressState, completedLevelIds: ["animals-1"] }, first), first.id);
    const started = startBonusRushRun(active, first.id, rushRun);
    const updated = updateBonusRushRun(started, first.id, { ...rushRun, index: 2, correct: 1, wrong: 1 });

    expect(updated.bonusOpportunities[0]?.rushRun).toMatchObject({ index: 2, correct: 1, wrong: 1 });
    expect(updated.completedLevelIds).toEqual(["animals-1"]);
    expect(updated.bestResultsByLevelId).toEqual(initialProgressState.bestResultsByLevelId);
  });
  it("allows a later replay event without changing persistent mission progress", () => {
    const firstConsumed = consumeBonusOpportunity(createBonusOpportunity(initialProgressState, first), first.id);
    const next = createBonusOpportunity(firstConsumed, second);
    expect(getPendingBonus(next)).toMatchObject(second);
    expect(next.completedLevelIds).toEqual(initialProgressState.completedLevelIds);
    expect(next.bestResultsByLevelId).toEqual(initialProgressState.bestResultsByLevelId);
    expect(next.rushUnlockedIslands).toEqual(initialProgressState.rushUnlockedIslands);
  });

  it("persists a first spin before animation, so refresh cannot reroll it", () => {
    const active = activateBonusOpportunity(createBonusOpportunity(initialProgressState, first), first.id);
    const spun = spinBonusWheel(active, first.id, () => 0.2);
    const restored = parseProgressState(JSON.parse(JSON.stringify(spun)));

    expect(restored.bonusOpportunities[0]?.wheel).toEqual({ status: "resolved", rerollUsed: false, reward: "double-points" });
    expect(spinBonusWheel(restored, first.id, () => 0.8)).toBe(restored);
  });

  it("allows exactly one persisted reroll and excludes reroll from its second spin", () => {
    const active = activateBonusOpportunity(createBonusOpportunity(initialProgressState, first), first.id);
    const firstSpin = spinBonusWheel(active, first.id, () => 0.999);
    expect(firstSpin.bonusOpportunities[0]?.wheel).toEqual({ status: "reroll", rerollUsed: true });

    const secondSpin = spinBonusWheel(parseProgressState(JSON.parse(JSON.stringify(firstSpin))), first.id, () => 0.999);
    expect(secondSpin.bonusOpportunities[0]?.wheel).toEqual({ status: "resolved", rerollUsed: true, reward: "none" });
    expect(spinBonusWheel(secondSpin, first.id, () => 0)).toBe(secondSpin);
    expect(chooseBonusWheelSegment(true, () => 0.999)).not.toBe("reroll");
  });

  it("keeps wheel state isolated to each opportunity and leaves normal progress alone", () => {
    const active = activateBonusOpportunity(createBonusOpportunity({ ...initialProgressState, completedLevelIds: ["animals-1"] }, first), first.id);
    const spun = spinBonusWheel(active, first.id, () => 0);
    const later = createBonusOpportunity(consumeBonusOpportunity(spun, first.id), second);

    expect(later.bonusOpportunities[0]?.wheel).toEqual({ status: "resolved", rerollUsed: false, reward: "extra-life" });
    expect(later.bonusOpportunities[1]?.wheel).toBeUndefined();
    expect(later.completedLevelIds).toEqual(["animals-1"]);
    expect(bonusWheelSegments).toHaveLength(6);
  });
});
