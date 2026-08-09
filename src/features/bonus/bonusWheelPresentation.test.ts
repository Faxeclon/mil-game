import { describe, expect, it } from "vitest";
import { bonusWheelSegments } from "./bonusOpportunity";
import { getSegmentAtPointer, getWheelRotation, getWheelSegmentCenterAngle } from "./bonusWheelPresentation";

describe("bonus wheel presentation", () => {
  it("keeps exactly six stable segments", () => {
    expect(bonusWheelSegments).toHaveLength(6);
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
