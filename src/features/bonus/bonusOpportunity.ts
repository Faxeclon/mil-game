import type { CategoryKey, IslandKey } from "@/features/levels/levelModel";
import type { ProgressState } from "@/features/progress/progressState";

export type BonusDestination = { kind: "island"; islandKey: IslandKey } | { kind: "worlds" };
export type BonusStatus = "pending" | "active" | "consumed";

export type BonusOpportunity = {
  /** Completion-event id: one event can create one and only one opportunity. */
  id: string;
  categoryKey: CategoryKey;
  islandKey: IslandKey;
  destination: BonusDestination;
  status: BonusStatus;
};

export type BonusOpportunityInput = Omit<BonusOpportunity, "status">;

export function getPendingBonus(state: ProgressState): BonusOpportunity | undefined {
  return state.bonusOpportunities?.find((bonus) => bonus.status === "pending");
}

export function getActiveBonus(state: ProgressState): BonusOpportunity | undefined {
  return state.bonusOpportunities?.find((bonus) => bonus.status === "active");
}

export function createBonusOpportunity(state: ProgressState, input: BonusOpportunityInput): ProgressState {
  const opportunities = state.bonusOpportunities ?? [];
  if (opportunities.some((bonus) => bonus.id === input.id)) return state;
  return { ...state, bonusOpportunities: [...opportunities, { ...input, status: "pending" }] };
}

export function activateBonusOpportunity(state: ProgressState, id: string): ProgressState {
  const bonus = state.bonusOpportunities?.find((entry) => entry.id === id);
  if (!bonus || bonus.status !== "pending" || getActiveBonus(state)) return state;
  return { ...state, bonusOpportunities: state.bonusOpportunities!.map((entry) => entry.id === id ? { ...entry, status: "active" } : entry) };
}

export function consumeBonusOpportunity(state: ProgressState, id: string): ProgressState {
  const bonus = state.bonusOpportunities?.find((entry) => entry.id === id);
  if (!bonus || bonus.status === "consumed") return state;
  return { ...state, bonusOpportunities: state.bonusOpportunities!.map((entry) => entry.id === id ? { ...entry, status: "consumed" } : entry) };
}
