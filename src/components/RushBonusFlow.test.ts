import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function source(file: string): Promise<string> {
  return readFile(join(process.cwd(), "src", "components", file), "utf8");
}

describe("consumable Bonus Rush flow", () => {
  it("guards Rush with the active ticket for the current profile and island", async () => {
    const guard = await source("RushRouteGuard.tsx");
    expect(guard).toContain("getActiveBonusForIsland(progressState, island)");
    expect(guard).toContain("admittedRun.profileId === profiles.activeId");
    expect(guard).toContain("completedBonusId === admittedRun.bonusId");
    expect(guard).toContain("router.replace(`/island/${island}`)");
    expect(guard).not.toContain("isIslandRushUnlocked");
  });

  it("keeps the active ticket through refresh, consumes on finish or explicit exit, and uses its destination", async () => {
    const client = await source("RushClient.tsx");
    expect(client).toContain("const activeBonus = getActiveBonusForIsland(progressState, island)");
    expect(client).toContain("consumeBonusOpportunity(bonus.id)");
    expect(client).toContain("retainCompletedBonus(bonus.id)");
    expect(client).toContain("const abandonBonus");
    expect(client).toContain("router.push(getBonusDestinationPath(bonus.destination))");
    expect(client).not.toContain("beforeunload");
  });
});
