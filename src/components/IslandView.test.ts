import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("island Bonus access", () => {
  it("does not offer a permanent Rush card or route from the normal island UI", async () => {
    const screen = await readFile(join(process.cwd(), "src", "components", "IslandView.tsx"), "utf8");
    expect(screen).not.toContain("/rush");
    expect(screen).not.toContain("isIslandRushUnlocked");
    expect(screen).not.toContain("tRush");
  });
});
