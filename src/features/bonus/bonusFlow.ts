import type { BonusOpportunity } from "./bonusOpportunity";

/** The only forward path for an active Bonus; completed runs never return to its wheel. */
export type BonusFlowStage = "wheel" | "lobby" | "run" | "result" | "closed";

export function getBonusFlowStage(bonus: BonusOpportunity | null | undefined, wheelAcknowledged: boolean): BonusFlowStage {
  if (!bonus || bonus.status !== "active") return "closed";
  if (!bonus.rushRun) {
    return bonus.wheel?.status === "resolved" && wheelAcknowledged ? "lobby" : "wheel";
  }
  return bonus.rushRun.finished ? "result" : "run";
}
