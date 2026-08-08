import type { CardDetection } from "./scanSession";

/**
 * The thin layer that touches the camera, kept apart from every rule that matters.
 *
 * Reading a code is the one part of the classroom mode that cannot be tested without a
 * lens, so it is deliberately the smallest file in the feature: open a camera, hand frames
 * to the browser's own decoder, pass what comes back to `scanSession`. Everything worth
 * arguing about - confidence, duplicates, which way up - lives on the other side of that
 * boundary and is covered by tests.
 *
 * We use the browser's built-in `BarcodeDetector`. It costs no download on a phone that
 * already has it, which matters for a device on a school connection, and it reports the
 * corner points we need to tell A from B. Where it is missing the teacher is told plainly
 * and the manual list stays available - the session never depends on the camera.
 */

/** What a decoder gives back for one code in one frame. */
type DetectedBarcode = { rawValue: string; cornerPoints: { x: number; y: number }[] };

type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

function getConstructor(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  return typeof candidate === "function" ? candidate : null;
}

/** Whether this browser can read codes at all. Asked before promising the teacher a camera. */
export function canDetectCodes(): boolean {
  return getConstructor() !== null;
}

export function canOpenCamera(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export type CardDetector = { detect: (source: CanvasImageSource) => Promise<CardDetection[]> };

/**
 * Builds a detector, or nothing when the browser has none.
 *
 * Failures inside a frame resolve to an empty list rather than throwing: a single unreadable
 * frame is ordinary while a camera pans across a room, and it must not end the sweep.
 */
export function createCardDetector(): CardDetector | null {
  const Detector = getConstructor();
  if (!Detector) return null;

  let detector: BarcodeDetectorLike;
  try {
    detector = new Detector({ formats: ["qr_code"] });
  } catch {
    return null;
  }

  return {
    async detect(source) {
      try {
        const codes = await detector.detect(source);
        return codes.map((code) => ({ payload: code.rawValue, corners: code.cornerPoints ?? [] }));
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
 * walking between desks does not move faster than this. It is a budget, not a limit on how
 * many cards can be read: several codes in one frame all count.
 */
export const SCAN_INTERVAL_MS = 250;
