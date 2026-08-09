import { describe, expect, it } from "vitest";
import { bonusWheelSegments } from "./bonusOpportunity";
import { getSegmentAtPointer, getWheelLabelPlacement, getWheelRotation, getWheelSegmentCenterAngle } from "./bonusWheelPresentation";

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

  it("places every final label inside a safe horizontal overlay on all six outcomes", () => {
    for (const result of bonusWheelSegments) {
      const rotation = getWheelRotation(result);
      expect(getSegmentAtPointer(rotation)).toBe(result);

      for (const segment of bonusWheelSegments) {
        const placement = getWheelLabelPlacement(segment, rotation);
        expect(placement.horizontal).toBe(true);
        expect(placement.x).toBeGreaterThan(.15);
        expect(placement.x).toBeLessThan(.85);
        expect(placement.y).toBeGreaterThan(.15);
        expect(placement.y).toBeLessThan(.85);
      }

      expect(getWheelLabelPlacement(result, rotation).angle).toBe(0);
    }
  });
});
