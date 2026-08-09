import { describe, expect, it } from "vitest";
import { initialRushState, rushReducer } from "./rushState";
import { isShieldActivation, SHIELD_FEEDBACK_MS } from "./shieldFeedback";

const cameraItem = { id: "camera", src: "/camera.jpg", altKey: "media.camera", isAi: false };
const aiItem = { id: "ai", src: "/ai.jpg", altKey: "media.ai", isAi: true };

function answer(state: ReturnType<typeof rushReducer>, saidAi: boolean, item = cameraItem) {
  return rushReducer(state, { type: "answer", saidAi, item, total: 2, reward: "extra-life" });
}

describe("shield feedback transition", () => {
  it("appears once for the first shielded error, while keeping that question", () => {
    const before = rushReducer(initialRushState, { type: "start" });
    const shielded = answer(before, true);

    expect(isShieldActivation(before, shielded)).toBe(true);
    expect(shielded).toMatchObject({ status: "playing", index: 0, actualMistakeCount: 1, shieldUsed: true });
    expect(SHIELD_FEEDBACK_MS).toBeGreaterThanOrEqual(800);
    expect(SHIELD_FEEDBACK_MS).toBeLessThanOrEqual(1100);
  });

  it("does not appear for correct answers, a later error, or a restored run", () => {
    const before = rushReducer(initialRushState, { type: "start" });
    const correct = answer(before, true, aiItem);
    const shielded = answer(before, true);
    const secondError = answer(shielded, true);
    const restored = { ...shielded, lastAnswer: null };

    expect(isShieldActivation(before, correct)).toBe(false);
    expect(isShieldActivation(shielded, secondError)).toBe(false);
    expect(isShieldActivation(restored, restored)).toBe(false);
    expect(secondError).toMatchObject({ actualMistakeCount: 2, shieldUsed: true, index: 1 });
  });
});
