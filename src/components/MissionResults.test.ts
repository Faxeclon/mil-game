import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function source(file: string): Promise<string> {
  return readFile(join(process.cwd(), "src", "components", file), "utf8");
}

describe("section-completion Bonus offer", () => {
  it("persists the event ticket before opening the second dialog", async () => {
    const screen = await source("MissionResults.tsx");
    expect(screen).toContain("getBonusOpportunityId(celebration.categoryKey, celebration.completionAttemptId)");
    expect(screen).toContain("createBonusOpportunity({");
    expect(screen).toContain("setBonusOfferOpen(true)");
    expect(screen).toContain("celebration && !bonusOfferOpen");
    expect(screen).toContain("bonusOfferOpen && bonus?.status === \"pending\"");
  });

  it("makes accepting active, and declining or Escape consume and follow the saved destination", async () => {
    const screen = await source("MissionResults.tsx");
    expect(screen).toContain("activateBonusOpportunity(bonus.id)");
    expect(screen).toContain("router.push(`/island/${bonus.islandKey}/rush`)");
    expect(screen).toContain("consumeBonusOpportunity(bonus.id)");
    expect(screen).toContain("router.push(getBonusDestinationPath(bonus.destination))");
    expect(screen).toContain('event.key === "Escape"');
    expect(screen).toContain("declineBonus();");
  });

  it("does not reopen a consumed or active ticket and traps focus in the choice dialog", async () => {
    const screen = await source("MissionResults.tsx");
    expect(screen).toContain('bonus?.status !== "consumed" && bonus?.status !== "active"');
    expect(screen).toContain("querySelectorAll<HTMLButtonElement>(\"button:not([disabled])\")");
  });
});
