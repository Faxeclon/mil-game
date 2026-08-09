import { describe, expect, it } from "vitest";
import { initialProgressState, parseProgressState } from "@/features/progress/progressState";
import { activateBonusOpportunity, consumeBonusOpportunity, createBonusOpportunity, getActiveBonus, getPendingBonus } from "./bonusOpportunity";

const first = { id: "animals:attempt-1", categoryKey: "animals" as const, islandKey: "difference" as const, destination: { kind: "island" as const, islandKey: "difference" as const } };
const second = { id: "animals:attempt-2", categoryKey: "animals" as const, islandKey: "difference" as const, destination: { kind: "worlds" as const } };

describe("per-profile bonus opportunities", () => {
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
  it("allows a later replay event without changing persistent mission progress", () => {
    const firstConsumed = consumeBonusOpportunity(createBonusOpportunity(initialProgressState, first), first.id);
    const next = createBonusOpportunity(firstConsumed, second);
    expect(getPendingBonus(next)).toMatchObject(second);
    expect(next.completedLevelIds).toEqual(initialProgressState.completedLevelIds);
  });
});
