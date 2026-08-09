import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("island-wide Bonus hunt wiring", () => {
  it("passes the route island pool to Rush instead of the section pool", async () => {
    const page = await readFile(join(process.cwd(), "src", "app", "[locale]", "island", "[islandKey]", "rush", "page.tsx"), "utf8");
    const client = await readFile(join(process.cwd(), "src", "components", "RushClient.tsx"), "utf8");
    expect(page).toContain("buildIslandRushPool(islandKey as IslandKey");
    expect(page).toContain("<RushClient island={islandKey as IslandKey} pool={pool}");
    expect(page).not.toContain("buildCategoryRushPool");
    expect(client).toContain("pool: readonly RushItem[]");
    expect(client).not.toContain("poolsByCategory");
  });

  it("continues restoring the exact persisted deck after refresh", async () => {
    const client = await readFile(join(process.cwd(), "src", "components", "RushClient.tsx"), "utf8");
    expect(client).toContain("restoreDeck(pool, run?.deckItemIds)");
    expect(client).toContain("deckItemIds: nextDeck.map");
  });
});
