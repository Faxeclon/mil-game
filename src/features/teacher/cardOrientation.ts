import type { CardAnswer } from "./classCards";

/**
 * Which way up a card is being held, worked out from the corners of its own code.
 *
 * The warning in the teacher-mode brief is real: a QR reader normalises rotation before it
 * returns the text, so the decoded string is identical whichever way the paper is turned.
 * Asking the payload which answer this is would always give the same reply.
 *
 * The corners do not lie, though. A decoder reports them in the code's own order - its
 * top-left first, then its top-right - expressed in image coordinates. So the line from the
 * first corner to the second is the top edge of the printed card, and the direction that
 * line points in *is* the rotation of the paper in front of the camera.
 *
 *      A up, 0 degrees              B up, 180 degrees
 *      0 ─────────► 1              2 ◄───────── 3
 *      │    QR     │               │    QR     │
 *      3 ───────── 2               1 ───────── 0
 *
 * Nothing about the child is involved: this is geometry on a sheet of paper.
 */
export type CardCorner = { x: number; y: number };

/** Undecided on purpose. A card held sideways is asked again, never guessed at. */
export type CardOrientation = CardAnswer | "ambiguous";

/**
 * How far a card may lean and still count.
 *
 * Children hold paper at an angle, especially the ones waving it from the back row, so a
 * strict reading would reject half a classroom. Forty degrees either way accepts a real
 * tilt while leaving a wide sideways band that resolves to "ask them to straighten it" -
 * which is the honest answer, and the one the brief asks for.
 */
export const ORIENTATION_TOLERANCE_DEGREES = 40;

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Distance from an angle to a target, the short way round the circle. */
function angularDistance(angle: number, target: number): number {
  return Math.abs(((angle - target + 540) % 360) - 180);
}

function isFinitePoint(point: unknown): point is CardCorner {
  return (
    typeof point === "object" &&
    point !== null &&
    Number.isFinite((point as CardCorner).x) &&
    Number.isFinite((point as CardCorner).y)
  );
}

/**
 * The angle of the card's top edge, in degrees, or null when the corners are unusable.
 *
 * Image coordinates grow downwards, so the vertical component is negated to give the
 * ordinary reading where zero points right and ninety points up.
 */
export function getTopEdgeAngle(corners: readonly unknown[]): number | null {
  if (corners.length < 2) return null;
  const [topLeft, topRight] = corners;
  if (!isFinitePoint(topLeft) || !isFinitePoint(topRight)) return null;

  const dx = topRight.x - topLeft.x;
  const dy = topRight.y - topLeft.y;
  // A code detected as a single point carries no direction, so no answer is invented.
  if (dx === 0 && dy === 0) return null;

  return (toDegrees(Math.atan2(-dy, dx)) + 360) % 360;
}

/**
 * Reads the answer off a detected code.
 *
 * The card is printed with A at the top, so an upright card answers A and one turned over
 * answers B. Anything in between is refused rather than rounded to the nearer side: a
 * wrong answer recorded silently is worse for a child than being asked to hold it straight.
 */
export function getCardOrientation(corners: readonly unknown[]): CardOrientation {
  const angle = getTopEdgeAngle(corners);
  return angle === null ? "ambiguous" : getCardOrientationFromAngle(angle);
}

/** Converts a decoder-reported rotation into the side shown by the paper card. */
export function getCardOrientationFromAngle(angle: unknown): CardOrientation {
  if (typeof angle !== "number" || !Number.isFinite(angle)) return "ambiguous";
  const normalized = ((angle % 360) + 360) % 360;

  if (angularDistance(normalized, 0) <= ORIENTATION_TOLERANCE_DEGREES) return "A";
  if (angularDistance(normalized, 180) <= ORIENTATION_TOLERANCE_DEGREES) return "B";
  return "ambiguous";
}
