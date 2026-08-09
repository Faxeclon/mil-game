import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

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
    expect(wheel).toContain("bonusWheelTokens[segment]");
    expect(wheel).not.toContain("t(`wheelRewards.${rewardKeys[segment]}`)");
  });

  it("honours reduced motion while keeping the wheel usable", async () => {
    const wheel = await source("BonusRewardWheel.tsx");
    const css = await source("BonusRewardWheel.module.css");
    expect(wheel).toContain("useAccessibility");
    expect(wheel).toContain("reducedMotion ? 0 : 900");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("segmentWinner");
    expect(css).toContain("pointer::after");
  });

  it("keeps full localized reward labels outside the wheel", async () => {
    const wheel = await source("BonusRewardWheel.tsx");
    expect(wheel).toContain('t("wheelYourBonus")');
    expect(wheel).toContain("t(`wheelRewards.${rewardKeys[selected]}`)");
    expect(spanishMessages.rush.wheelRewards).toMatchObject({
      extraLife: "Vida extra", doublePoints: "x2 puntos", extra15: "+15 segundos", extra10: "+10 segundos", none: "Sin bonus", reroll: "Otra vuelta"
    });
    expect(englishMessages.rush.wheelRewards).toMatchObject({
      extraLife: "Extra Life", doublePoints: "Double points", extra15: "+15 seconds", extra10: "+10 seconds", none: "No bonus", reroll: "Spin again"
    });
  });

  it("keeps Rush in its lobby and its timer stopped until a final reward is continued", async () => {
    const client = await source("RushClient.tsx");
    expect(client).toContain("getBonusFlowStage(bonus, wheelAcknowledged)");
    expect(client).toContain("<BonusRewardWheel bonus={bonus}");
    expect(client).toContain('flowStage === "wheel"');
  });
});
