import { bonusWheelSegments, type BonusWheelSegment } from "./bonusOpportunity";

const segmentAngle = 360 / bonusWheelSegments.length;

export type WheelLabelPlacement = {
  angle: number;
  horizontal: true;
  x: number;
  y: number;
};

/** The angle, clockwise from the pointer at 12 o'clock, of a segment's centre. */
export function getWheelSegmentCenterAngle(segment: BonusWheelSegment): number {
  return (bonusWheelSegments.indexOf(segment) + 0.5) * segmentAngle;
}

/**
 * The wheel turns underneath a fixed pointer. Three full turns make the motion feel like
 * a spin; the final offset centres the persisted segment exactly beneath that pointer.
 */
export function getWheelRotation(segment: BonusWheelSegment, turns = 3): number {
  return turns * 360 - getWheelSegmentCenterAngle(segment);
}

/**
 * Places a label in the centre of its rotated wedge, at a radius that clears
 * both the hub and the rim. The label layer itself never rotates.
 */
export function getWheelLabelPlacement(segment: BonusWheelSegment, rotation: number): WheelLabelPlacement {
  const angle = ((getWheelSegmentCenterAngle(segment) + rotation) % 360 + 360) % 360;
  const radians = angle * Math.PI / 180;
  const safeRadius = .31;

  return {
    angle,
    horizontal: true,
    x: .5 + Math.sin(radians) * safeRadius,
    y: .5 - Math.cos(radians) * safeRadius
  };
}

/** Which original segment lies at the fixed pointer after a wheel rotation. */
export function getSegmentAtPointer(rotation: number): BonusWheelSegment {
  const normalized = ((-rotation % 360) + 360) % 360;
  return bonusWheelSegments[Math.floor(normalized / segmentAngle)] ?? bonusWheelSegments[0];
}
