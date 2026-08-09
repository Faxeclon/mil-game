import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function source(file: string): Promise<string> {
  return readFile(join(process.cwd(), "src", "components", file), "utf8");
}

describe("Bonus reward wheel", () => {
  it("renders six visual segments and persists before the animation", async () => {
    const wheel = await source("BonusRewardWheel.tsx");
    expect(wheel).toContain("bonusWheelSegments.map");
    expect(wheel).toContain("spinBonusWheel(bonus.id)");
    expect(wheel).toContain("spinLock.current");
    expect(wheel).toContain("The store commits first");
    expect(wheel).toContain('bonus.wheel?.status === "reroll"');
  });

  it("honours reduced motion while keeping the wheel usable", async () => {
    const wheel = await source("BonusRewardWheel.tsx");
    const css = await source("BonusRewardWheel.module.css");
    expect(wheel).toContain("useAccessibility");
    expect(wheel).toContain("reducedMotion ? 0 : 900");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps Rush in its lobby and its timer stopped until a final reward is continued", async () => {
    const client = await source("RushClient.tsx");
    expect(client).toContain('bonus.wheel?.status !== "resolved" || !wheelContinued');
    expect(client).toContain("<BonusRewardWheel bonus={bonus}");
    expect(client).toContain('bonus.wheel?.status !== "resolved" || !wheelContinued || bonus.rushRun');
  });
});
