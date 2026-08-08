import { describe, expect, it } from "vitest";
import {
  getCardOrientation,
  getTopEdgeAngle,
  ORIENTATION_TOLERANCE_DEGREES,
  type CardCorner
} from "./cardOrientation";

/**
 * Corners as a decoder reports them: the code's own top-left first, then clockwise,
 * in image coordinates where y grows downwards.
 */
function cornersAtAngle(degrees: number, size = 100): CardCorner[] {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  // Unit square rotated by the given angle, then scaled. Screen y is inverted.
  const point = (x: number, y: number): CardCorner => ({
    x: (x * cos - y * sin) * size,
    y: -(x * sin + y * cos) * size
  });

  return [point(0, 0), point(1, 0), point(1, -1), point(0, -1)];
}

describe("reading which way up a card is held", () => {
  it("calls an upright card A and an upside-down card B", () => {
    expect(getCardOrientation(cornersAtAngle(0))).toBe("A");
    expect(getCardOrientation(cornersAtAngle(180))).toBe("B");
  });

  it("accepts the tilt of a child waving paper from the back row", () => {
    for (const tilt of [-30, -15, 15, 30]) {
      expect(getCardOrientation(cornersAtAngle(tilt))).toBe("A");
      expect(getCardOrientation(cornersAtAngle(180 + tilt))).toBe("B");
    }
  });

  it("refuses a card held sideways instead of rounding it to the nearer answer", () => {
    for (const sideways of [90, 270, 75, 285]) {
      expect(getCardOrientation(cornersAtAngle(sideways))).toBe("ambiguous");
    }
  });

  it("treats the tolerance boundary as the last accepted lean", () => {
    const inside = ORIENTATION_TOLERANCE_DEGREES - 1;
    const outside = ORIENTATION_TOLERANCE_DEGREES + 1;

    expect(getCardOrientation(cornersAtAngle(inside))).toBe("A");
    expect(getCardOrientation(cornersAtAngle(outside))).toBe("ambiguous");
  });

  it("does not depend on how large the code appears, so distance never changes the answer", () => {
    for (const size of [8, 100, 4000]) {
      expect(getCardOrientation(cornersAtAngle(0, size))).toBe("A");
      expect(getCardOrientation(cornersAtAngle(180, size))).toBe("B");
    }
  });

  /*
   * The whole point of reading the corners: a decoder normalises rotation before it
   * returns the text, so an upright card and an upside-down one decode identically. If
   * these two ever agreed, the feature would be silently answering A for everybody.
   */
  it("distinguishes two cards whose decoded text would be identical", () => {
    expect(getCardOrientation(cornersAtAngle(0))).not.toBe(getCardOrientation(cornersAtAngle(180)));
  });
});

describe("corners that cannot be trusted", () => {
  it("gives no angle when there are too few corners", () => {
    expect(getTopEdgeAngle([])).toBeNull();
    expect(getTopEdgeAngle([{ x: 1, y: 1 }])).toBeNull();
  });

  it("gives no angle when a corner is missing a usable coordinate", () => {
    expect(getTopEdgeAngle([{ x: 0, y: 0 }, { x: Number.NaN, y: 4 }])).toBeNull();
    expect(getTopEdgeAngle([{ x: 0, y: 0 }, { x: Number.POSITIVE_INFINITY, y: 4 }])).toBeNull();
    expect(getTopEdgeAngle([{ x: 0, y: 0 }, null])).toBeNull();
    expect(getTopEdgeAngle([{ x: 0, y: 0 }, "corner"])).toBeNull();
  });

  it("gives no angle when the code collapses to a single point", () => {
    expect(getTopEdgeAngle([{ x: 7, y: 7 }, { x: 7, y: 7 }])).toBeNull();
  });

  it("reports unusable corners as ambiguous rather than as an answer", () => {
    expect(getCardOrientation([])).toBe("ambiguous");
    expect(getCardOrientation([{ x: 7, y: 7 }, { x: 7, y: 7 }])).toBe("ambiguous");
  });
});
