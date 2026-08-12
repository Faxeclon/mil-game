import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readBarcodes = vi.fn();
const prepareZXingModule = vi.fn().mockResolvedValue({});
vi.mock("zxing-wasm/reader", () => ({ readBarcodes, prepareZXingModule }));

const {
  canDetectCodes,
  canOpenCamera,
  CardScannerUnavailableError,
  closeCamera,
  collectCardDetections,
  createCardDetector,
  getScanScale,
  MAX_SYMBOLS_PER_FRAME,
  openCamera
} = await import("./cardScanner");

const position = {
  topLeft: { x: 10, y: 10 },
  topRight: { x: 90, y: 10 },
  bottomRight: { x: 90, y: 90 },
  bottomLeft: { x: 10, y: 90 }
};

function result(text: string, orientation = 0) {
  return { text, orientation, position };
}

/** A canvas that records what it was asked to draw, without needing a real one. */
function stubCanvas(options: { context?: boolean } = {}) {
  const drawn: Array<{ width: number; height: number }> = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () =>
      options.context === false
        ? null
        : {
            drawImage: (_source: unknown, _x: number, _y: number, width: number, height: number) => {
              drawn.push({ width, height });
            },
            getImageData: (_x: number, _y: number, width: number, height: number) => ({
              data: new Uint8ClampedArray(width * height * 4),
              width,
              height
            })
          }
  };
  vi.stubGlobal("document", { createElement: () => canvas });
  return { canvas, drawn };
}

const frame = { videoWidth: 1920, videoHeight: 1080 } as unknown as CanvasImageSource;

beforeEach(() => {
  readBarcodes.mockReset();
  prepareZXingModule.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("knowing what this browser can do before promising it", () => {
  it("reports no code reading where there is no canvas to decode through", () => {
    vi.stubGlobal("document", undefined);
    expect(canDetectCodes()).toBe(false);
  });

  it("reports code reading wherever a canvas can be made", () => {
    stubCanvas();
    expect(canDetectCodes()).toBe(true);
  });

  it("reports no camera when the device exposes none", () => {
    vi.stubGlobal("navigator", {});
    expect(canOpenCamera()).toBe(false);
    vi.stubGlobal("navigator", { mediaDevices: {} });
    expect(canOpenCamera()).toBe(false);
  });
});

describe("bounded multi-card frames", () => {
  it("shrinks a 1080p camera frame to a QR-readable 960px edge", () => {
    expect(getScanScale(1920, 1080)).toBeCloseTo(960 / 1920);
    expect(getScanScale(1080, 1920)).toBeCloseTo(960 / 1920);
    expect(getScanScale(320, 240)).toBe(1);
  });

  it("asks the WASM reader for QR codes only and no more than a classroom group", async () => {
    const { drawn } = stubCanvas();
    readBarcodes.mockResolvedValue([]);

    await createCardDetector()!.detect(frame);

    expect(drawn).toEqual([{ width: 960, height: 540 }]);
    expect(readBarcodes).toHaveBeenCalledWith(expect.anything(), {
      formats: ["QRCode"],
      tryHarder: true,
      maxNumberOfSymbols: MAX_SYMBOLS_PER_FRAME
    });
  });

  it("keeps every valid QR in one frame, with its own geometry and rotation", () => {
    const detections = collectCardDetections([
      result("KIKIRIA:1:AAAAAA:BBBBBB", 0),
      result("KIKIRIA:1:AAAAAA:CCCCCC", 180),
      result("KIKIRIA:1:AAAAAA:DDDDDD", 90)
    ]);

    expect(detections).toEqual([
      { payload: "KIKIRIA:1:AAAAAA:BBBBBB", corners: [position.topLeft, position.topRight, position.bottomRight, position.bottomLeft], orientation: 0 },
      { payload: "KIKIRIA:1:AAAAAA:CCCCCC", corners: [position.topLeft, position.topRight, position.bottomRight, position.bottomLeft], orientation: 180 },
      { payload: "KIKIRIA:1:AAAAAA:DDDDDD", corners: [position.topLeft, position.topRight, position.bottomRight, position.bottomLeft], orientation: 90 }
    ]);
  });

  it("processes an eight-card classroom group conceptually in one frame", () => {
    const results = Array.from({ length: 8 }, (_, index) =>
      result(`KIKIRIA:1:AAAAAA:A${String(index).padStart(5, "2")}`, index % 2 === 0 ? 0 : 180)
    );

    expect(collectCardDetections(results)).toHaveLength(8);
  });

  it("drops malformed payloads but retains a valid foreign classroom for the session to reject", () => {
    const detections = collectCardDetections([
      result("not a Kikiria card"),
      result("KIKIRIA:9:AAAAAA:BBBBBB"),
      result("KIKIRIA:1:FOREIG:BBBBBB")
    ]);

    expect(detections.map((detection) => detection.payload)).toEqual(["KIKIRIA:1:FOREIG:BBBBBB"]);
  });

  it("deduplicates the same QR in a frame before confidence tracking", () => {
    expect(collectCardDetections([
      result("KIKIRIA:1:AAAAAA:BBBBBB", 0),
      result("KIKIRIA:1:AAAAAA:BBBBBB", 180)
    ])).toHaveLength(1);
  });

  it("reports a reader-load failure distinctly from an empty frame", async () => {
    stubCanvas();
    readBarcodes.mockRejectedValue(new Error("WASM unavailable"));

    await expect(createCardDetector()!.detect(frame)).rejects.toBeInstanceOf(CardScannerUnavailableError);
  });
});

describe("asking for and returning the camera", () => {
  it("says unsupported when the device has no camera API at all", async () => {
    vi.stubGlobal("navigator", {});
    await expect(openCamera()).resolves.toEqual({ kind: "failed", reason: "unsupported" });
  });

  it("separates a refused permission from a camera that is not there", async () => {
    for (const name of ["NotAllowedError", "SecurityError"]) {
      const error = new Error("no");
      error.name = name;
      vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(error) } });
      await expect(openCamera()).resolves.toEqual({ kind: "failed", reason: "denied" });
    }

    const missing = new Error("none");
    missing.name = "NotFoundError";
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(missing) } });
    await expect(openCamera()).resolves.toEqual({ kind: "failed", reason: "unavailable" });
  });

  it("stops every track, so a light is not left on all morning", () => {
    const stop = vi.fn();
    closeCamera({ getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream);
    expect(stop).toHaveBeenCalledTimes(2);
  });
});
