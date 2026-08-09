import { describe, expect, it } from "vitest";
import { initialProgressState, parseProgressState, resetProgressKeepingProfile } from "@/features/progress/progressState";
import { activateBonusOpportunity, consumeBonusOpportunity, createBonusOpportunity, getActiveBonus, getActiveBonusForIsland, getBonusDestinationPath, getBonusOpportunityId, getPendingBonus } from "./bonusOpportunity";

const first = { id: "animals:attempt-1", categoryKey: "animals" as const, islandKey: "difference" as const, destination: { kind: "island" as const, islandKey: "difference" as const } };
const second = { id: "animals:attempt-2", categoryKey: "animals" as const, islandKey: "difference" as const, destination: { kind: "worlds" as const } };

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
  it("allows a later replay event without changing persistent mission progress", () => {
    const firstConsumed = consumeBonusOpportunity(createBonusOpportunity(initialProgressState, first), first.id);
    const next = createBonusOpportunity(firstConsumed, second);
    expect(getPendingBonus(next)).toMatchObject(second);
    expect(next.completedLevelIds).toEqual(initialProgressState.completedLevelIds);
    expect(next.bestResultsByLevelId).toEqual(initialProgressState.bestResultsByLevelId);
    expect(next.rushUnlockedIslands).toEqual(initialProgressState.rushUnlockedIslands);
  });
});
