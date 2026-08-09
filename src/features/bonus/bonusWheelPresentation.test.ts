import { describe, expect, it } from "vitest";
import { bonusWheelSegments } from "./bonusOpportunity";
import { bonusWheelTokens, getSegmentAtPointer, getWheelRotation, getWheelSegmentCenterAngle } from "./bonusWheelPresentation";

describe("bonus wheel presentation", () => {
  it("maps all six segments to compact, stable wheel tokens", () => {
    expect(bonusWheelTokens).toEqual({
      "extra-life": "🛡",
      "double-points": "×2",
      "extra-15": "+15s",
      "extra-10": "+10s",
      none: "—",
      reroll: "↻"
    });
  });

  it("centres every persisted segment beneath the fixed pointer", () => {
    for (const segment of bonusWheelSegments) {
      expect(getWheelSegmentCenterAngle(segment)).toBeGreaterThan(0);
      expect(getSegmentAtPointer(getWheelRotation(segment))).toBe(segment);
    }
  });

  it("keeps the same visual result regardless of motion preference", () => {
    for (const segment of bonusWheelSegments) {
      expect(getSegmentAtPointer(getWheelRotation(segment))).toBe(segment);
    }
  });
});
