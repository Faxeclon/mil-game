import jsQR from "jsqr";
import type { CardDetection } from "./scanSession";

/**
 * The thin layer that touches the camera, kept apart from every rule that matters.
 *
 * Reading a code is the one part of the classroom mode that cannot be tested without a
 * lens, so it is deliberately the smallest file in the feature: open a camera, decode a
 * frame, pass what comes back to `scanSession`. Everything worth arguing about -
 * confidence, duplicates, which way up - lives on the other side of that boundary and is
 * covered by tests.
 *
 * ## Why not the browser's own BarcodeDetector
 *
 * It was used here first, and it produced a bug worth writing down: every card read as A.
 *
 * The whole card mechanic depends on knowing which way up the paper is, and a QR decoder
 * normalises rotation before returning text, so the payload cannot say. The rotation has
 * to come from geometry. `BarcodeDetector` exposes `cornerPoints`, and the specification
 * says only that they run "in clockwise direction and starting with top-left" - it never
 * says whose top-left. In practice they arrive ordered by the *image*, so the first edge
 * points rightwards no matter how the card is turned, and every answer came out A.
 *
 * jsQR reports the three finder patterns - the large squares a QR uses to declare its own
 * orientation - as distinct, named points. The line from the code's top-left finder to its
 * top-right finder is the top edge of the printed card, whatever angle the paper is at.
 * That is the one piece of information the mechanic needs, and it is the reason for the
 * dependency.
 *
 * ## What it costs
 *
 * jsQR decodes one code per frame, where BarcodeDetector could return several. A teacher
 * sweeping the room therefore collects cards one at a time rather than a row at once. At
 * four frames a second that is still a class in well under a minute, and `scanSession`
 * already requires two consistent readings per card, so a slow sweep was always the shape
 * of this.
 */

/** Longest edge of the frame handed to the decoder. */
const MAX_SCAN_EDGE = 640;

/**
 * Full-resolution frames are wasted work on the phone this is built for: a QR held up
 * across a classroom is still tens of pixels wide at this size, and decoding a 1080p frame
 * four times a second would heat the device for no extra reading.
 */
export function getScanScale(width: number, height: number): number {
  const longest = Math.max(width, height);
  if (!Number.isFinite(longest) || longest <= 0) return 1;
  return Math.min(1, MAX_SCAN_EDGE / longest);
}

export function canDetectCodes(): boolean {
  return typeof document !== "undefined" && typeof document.createElement === "function";
}

export function canOpenCamera(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export type CardDetector = { detect: (source: CanvasImageSource) => Promise<CardDetection[]> };

function getFrameSize(source: CanvasImageSource): { width: number; height: number } | null {
  const video = source as HTMLVideoElement;
  if (typeof video.videoWidth === "number" && video.videoWidth > 0) {
    return { width: video.videoWidth, height: video.videoHeight };
  }
  const sized = source as HTMLCanvasElement;
  if (typeof sized.width === "number" && sized.width > 0) {
    return { width: sized.width, height: sized.height };
  }
  return null;
}

/**
 * Builds a detector, or nothing when there is no canvas to decode through.
 *
 * Failures inside a frame resolve to an empty list rather than throwing: a single
 * unreadable frame is ordinary while a camera pans across a room, and it must not end the
 * sweep.
 */
export function createCardDetector(): CardDetector | null {
  if (!canDetectCodes()) return null;

  const canvas = document.createElement("canvas");
  // The frame is read back on every pass, which is exactly what this hint is for.
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  return {
    async detect(source) {
      try {
        const size = getFrameSize(source);
        if (!size) return [];

        const scale = getScanScale(size.width, size.height);
        const width = Math.max(1, Math.round(size.width * scale));
        const height = Math.max(1, Math.round(size.height * scale));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        context.drawImage(source, 0, 0, width, height);
        const frame = context.getImageData(0, 0, width, height);

        /*
         * Cards are printed black on white, so there is no reason to spend a second pass
         * looking for an inverted code on a phone that has none to spare.
         */
        const code = jsQR(frame.data, width, height, { inversionAttempts: "dontInvert" });
        if (!code) return [];

        /*
         * The two finder patterns, in the order `cardOrientation` expects: the code's own
         * top-left first, then its top-right. Their coordinates are in image space, so the
         * line between them carries the rotation of the paper - which is the whole point.
         */
        return [
          {
            payload: code.data,
            corners: [code.location.topLeftFinderPattern, code.location.topRightFinderPattern]
          }
        ];
      } catch {
        return [];
      }
    }
  };
}

export type CameraFailure = "denied" | "unavailable" | "unsupported";

export type CameraResult = { kind: "ready"; stream: MediaStream } | { kind: "failed"; reason: CameraFailure };

/**
 * Asks for the back camera, which is the one pointed at a classroom.
 *
 * The reasons are separated because the answer to each is different: a refused permission
 * can be granted, a missing camera means using another device, and an unsupported browser
 * means neither. Telling a teacher "something went wrong" would leave them stuck.
 */
export async function openCamera(): Promise<CameraResult> {
  if (!canOpenCamera()) return { kind: "failed", reason: "unsupported" };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    return { kind: "ready", stream };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "NotAllowedError" || name === "SecurityError") return { kind: "failed", reason: "denied" };
    return { kind: "failed", reason: "unavailable" };
  }
}

/** Releases the camera. A light left on in a classroom is a battery gone by lunchtime. */
export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * How often frames are examined.
 *
 * Every frame would be wasteful on the low-end phone this is built for, and a teacher
 * walking between desks does not move faster than this. Decoding happens on the main
 * thread, so this interval is also what keeps the page responsive while the camera is on.
 */
export const SCAN_INTERVAL_MS = 250;
