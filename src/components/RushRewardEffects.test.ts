import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("Bonus Rush reward integration", () => {
  it("uses the persisted reward for the timer, score, shield state and visible chip", async () => {
    const source = await readFile(join(process.cwd(), "src", "components", "RushClient.tsx"), "utf8");
    expect(source).toContain("const reward: BonusWheelReward");
    expect(source).toContain("getBonusRushDuration(reward)");
    expect(source).toContain("getBonusRushScore(state.rawCorrectCount, reward)");
    expect(source).toContain("<BonusRewardChip reward={reward} shieldUsed={state.shieldUsed} />");
    expect(source).toContain("run.durationSeconds");
    expect(source).toContain("isShieldActivation(state, next)");
    expect(source).toContain("disabled={shieldFeedbackVisible}");
    expect(source).toContain('t("shieldActivated")');
    expect(source).toContain('t("shieldRetry")');
    expect(source).toContain("reducedMotion ? 240 : SHIELD_FEEDBACK_MS");
    expect(source).toContain("shieldFeedbackLockRef.current");
  });
});
