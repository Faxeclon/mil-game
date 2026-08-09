import type { CategoryKey, IslandKey } from "@/features/levels/levelModel";
import type { ProgressState } from "@/features/progress/progressState";

export type BonusDestination = { kind: "island"; islandKey: IslandKey } | { kind: "worlds" };
export type BonusStatus = "pending" | "active" | "consumed";
export const bonusWheelRewards = ["extra-life", "double-points", "extra-15", "extra-10", "none"] as const;
export type BonusWheelReward = (typeof bonusWheelRewards)[number];
export const bonusWheelSegments = [...bonusWheelRewards, "reroll"] as const;
export type BonusWheelSegment = (typeof bonusWheelSegments)[number];

/**
 * A spin is recorded before its animation begins. `reroll` is an intermediate,
 * durable result rather than a final reward, so refresh cannot turn it into a
 * fresh first spin.
 */
export type BonusWheelState =
  | { status: "pending"; rerollUsed: false }
  | { status: "reroll"; rerollUsed: true }
  | { status: "resolved"; rerollUsed: boolean; reward: BonusWheelReward };

/** The minimum deterministic Rush state needed to resume one already-started Bonus. */
export type BonusRushRun = {
  runId: string;
  startedAt: number;
  /** Snapshotted final wheel reward; results do not depend on a live UI state. */
  reward: BonusWheelReward;
  /** Frozen at run start, so a refresh cannot change a time reward. */
  durationSeconds: number;
  deckItemIds: string[];
  index: number;
  /** Raw game counts stay separate from presentation and reward math. */
  rawCorrectCount: number;
  actualMistakeCount: number;
  visibleMistakeCount: number;
  shieldUsed: boolean;
  score: number;
  finished: boolean;
  ranOut: boolean;
};

export type BonusOpportunity = {
  /** Completion-event id: one event can create one and only one opportunity. */
  id: string;
  categoryKey: CategoryKey;
  islandKey: IslandKey;
  destination: BonusDestination;
  status: BonusStatus;
  wheel?: BonusWheelState;
  rushRun?: BonusRushRun;
};

export type BonusOpportunityInput = Omit<BonusOpportunity, "status" | "rushRun">;
export type BonusRushRunInput = BonusRushRun;

/**
 * Completion attempts are already stable across render and refresh. Pairing that id with
 * its category makes the same event idempotent, while a later full replay has a new
 * attempt id and therefore a new opportunity id.
 */
export function getBonusOpportunityId(categoryKey: CategoryKey, completionAttemptId: string): string {
  return `section-bonus:${categoryKey}:${completionAttemptId}`;
}

export function getBonusDestinationPath(destination: BonusDestination): string {
  return destination.kind === "island" ? `/island/${destination.islandKey}` : "/worlds";
}

/** Remaining time is derived from the persisted start, never from a component mount. */
export function getBonusRushSecondsLeft(startedAt: number, durationSeconds: number, now: number = Date.now()): number {
  return Math.max(0, durationSeconds - Math.floor((now - startedAt) / 1_000));
}

export function getPendingBonus(state: ProgressState): BonusOpportunity | undefined {
  return state.bonusOpportunities.find((bonus) => bonus.status === "pending");
}

export function getActiveBonus(state: ProgressState): BonusOpportunity | undefined {
  return state.bonusOpportunities.find((bonus) => bonus.status === "active");
}

/** The Rush route is tied to both the active ticket and its authored island. */
export function getActiveBonusForIsland(state: ProgressState, islandKey: string): BonusOpportunity | undefined {
  const bonus = getActiveBonus(state);
  return bonus?.islandKey === islandKey ? bonus : undefined;
}

export function createBonusOpportunity(state: ProgressState, input: BonusOpportunityInput): ProgressState {
  const opportunities = state.bonusOpportunities;
  if (opportunities.some((bonus) => bonus.id === input.id)) return state;
  return { ...state, bonusOpportunities: [...opportunities, { ...input, status: "pending" }] };
}

export function activateBonusOpportunity(state: ProgressState, id: string): ProgressState {
  const bonus = state.bonusOpportunities.find((entry) => entry.id === id);
  if (!bonus || bonus.status !== "pending" || getActiveBonus(state)) return state;
  return { ...state, bonusOpportunities: state.bonusOpportunities!.map((entry) => entry.id === id ? { ...entry, status: "active" } : entry) };
}

export function consumeBonusOpportunity(state: ProgressState, id: string): ProgressState {
  const bonus = state.bonusOpportunities.find((entry) => entry.id === id);
  if (!bonus || bonus.status === "consumed") return state;
  return { ...state, bonusOpportunities: state.bonusOpportunities!.map((entry) => entry.id === id ? { ...entry, status: "consumed" } : entry) };
}

/** Selects a segment from an injected source so selection is deterministic in tests. */
export function chooseBonusWheelSegment(rerollUsed: boolean, random: () => number = Math.random): BonusWheelSegment {
  const candidates: readonly BonusWheelSegment[] = rerollUsed ? bonusWheelRewards : bonusWheelSegments;
  const draw = random();
  const safeDraw = Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 0.999_999) : 0;
  return candidates[Math.floor(safeDraw * candidates.length)]!;
}

/**
 * Persists exactly one outcome per allowed spin. The first reroll is deliberately
 * kept as state; the only next spin excludes reroll and every resolved wheel is final.
 */
export function spinBonusWheel(
  state: ProgressState,
  id: string,
  random: () => number = Math.random
): ProgressState {
  const bonus = state.bonusOpportunities.find((entry) => entry.id === id);
  if (!bonus || bonus.status !== "active") return state;

  const current = bonus.wheel ?? { status: "pending", rerollUsed: false } as const;
  if (current.status === "resolved") return state;

  const segment = chooseBonusWheelSegment(current.rerollUsed, random);
  const wheel: BonusWheelState = segment === "reroll"
    ? { status: "reroll", rerollUsed: true }
    : { status: "resolved", rerollUsed: current.rerollUsed, reward: segment };

  return {
    ...state,
    bonusOpportunities: state.bonusOpportunities.map((entry) => entry.id === id ? { ...entry, wheel } : entry)
  };
}

/** Starts a single deterministic run. A refresh or double click cannot make another one. */
export function startBonusRushRun(state: ProgressState, id: string, run: BonusRushRunInput): ProgressState {
  const bonus = state.bonusOpportunities.find((entry) => entry.id === id);
  if (!bonus || bonus.status !== "active" || bonus.rushRun) return state;
  return {
    ...state,
    bonusOpportunities: state.bonusOpportunities.map((entry) =>
      entry.id === id ? { ...entry, rushRun: { ...run, deckItemIds: [...run.deckItemIds] } } : entry
    )
  };
}

/** Saves progress only into the already-started run, never into scores or mission completion. */
export function updateBonusRushRun(state: ProgressState, id: string, run: BonusRushRun): ProgressState {
  const bonus = state.bonusOpportunities.find((entry) => entry.id === id);
  if (!bonus?.rushRun || bonus.status !== "active") return state;
  return {
    ...state,
    bonusOpportunities: state.bonusOpportunities.map((entry) =>
      entry.id === id ? { ...entry, rushRun: { ...run, deckItemIds: [...run.deckItemIds] } } : entry
    )
  };
}
