import { prepareZXingModule, readBarcodes, type Position } from "zxing-wasm/reader";
import { parseCardPayload } from "./classCards";
import type { CardDetection } from "./scanSession";

/** The reader is deliberately capped: enough for a classroom group, bounded for a phone. */
export const MAX_SYMBOLS_PER_FRAME = 12;

/**
 * The reader WASM is served by Kikiria, rather than fetched from the package's CDN default.
 * That keeps the classroom scanner available after the app's first offline visit.
 */
const READER_WASM_URL = "/zxing/zxing_reader.wasm";
const zxingOverrides = { locateFile: () => READER_WASM_URL };
let readerPreparation: Promise<unknown> | null = null;

function prepareReader(): Promise<unknown> {
  readerPreparation ??= Promise.resolve(prepareZXingModule({ overrides: zxingOverrides, fireImmediately: true }));
  return readerPreparation;
}

/** Longest edge handed to the detector: 960×540 from a typical 1080p landscape camera. */
export const MAX_SCAN_EDGE = 960;

/**
 * A bounded frame retains several small classroom cards without asking a phone to process
 * 4K video. The frame loop is capped at four attempts a second and skips work while WASM
 * is busy, so this is an upper bound rather than competing decode jobs.
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

/** A load failure is distinct from an ordinary frame with no visible code. */
export class CardScannerUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("The multi-QR reader could not start.", { cause });
    this.name = "CardScannerUnavailableError";
  }
}

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

function cornersFrom(position: Position): CardDetection["corners"] {
  return [position.topLeft, position.topRight, position.bottomRight, position.bottomLeft];
}

/**
 * Keeps only Kikiria cards and one copy of each card identity in a camera frame.
 * A foreign class remains deliberately: `scanSession` reports it as foreign instead of
 * silently treating a real printed card as malformed.
 */
export function collectCardDetections(
  results: ReadonlyArray<{ text: string; position: Position; orientation: number }>
): CardDetection[] {
  const seen = new Set<string>();
  const detections: CardDetection[] = [];

  for (const result of results) {
    const identity = parseCardPayload(result.text);
    if (!identity) continue;
    const key = `${identity.classToken}:${identity.cardId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    detections.push({ payload: result.text, corners: cornersFrom(result.position), orientation: result.orientation });
  }

  return detections;
}

/**
 * Reads every QR code visible in one canvas frame. `zxing-wasm` returns an array, unlike
 * the former jsQR call which returned only its first match.
 */
export function createCardDetector(): CardDetector | null {
  if (!canDetectCodes()) return null;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  return {
    async detect(source) {
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

      try {
        await prepareReader();
        const results = await readBarcodes(frame, {
          formats: ["QRCode"],
          tryHarder: true,
          maxNumberOfSymbols: MAX_SYMBOLS_PER_FRAME
        });
        return collectCardDetections(results);
      } catch (error) {
        throw new CardScannerUnavailableError(error);
      }
    }
  };
}

export type CameraFailure = "denied" | "unavailable" | "unsupported";

export type CameraResult = { kind: "ready"; stream: MediaStream } | { kind: "failed"; reason: CameraFailure };

/** Asks for the back camera, which is the one pointed at a classroom. */
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

/** Four attempts a second at most; a busy decode skips the following frame. */
export const SCAN_INTERVAL_MS = 250;
