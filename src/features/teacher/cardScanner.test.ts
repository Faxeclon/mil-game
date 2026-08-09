import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const decode = vi.fn();
vi.mock("jsqr", () => ({ default: (...args: unknown[]) => decode(...args) }));

const {
  canDetectCodes,
  canOpenCamera,
  closeCamera,
  createCardDetector,
  getScanScale,
  openCamera
} = await import("./cardScanner");

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

/** A video element as the sweep hands it in. */
const frame = { videoWidth: 1920, videoHeight: 1080 } as unknown as CanvasImageSource;

beforeEach(() => {
  decode.mockReset();
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

  it("reports a camera when the device exposes one", () => {
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
    expect(canOpenCamera()).toBe(true);
  });
});

describe("keeping the work down to what a cheap phone can do", () => {
  it("shrinks a large frame and leaves a small one alone", () => {
    expect(getScanScale(1920, 1080)).toBeCloseTo(640 / 1920);
    expect(getScanScale(1080, 1920)).toBeCloseTo(640 / 1920);
    expect(getScanScale(320, 240)).toBe(1);
  });

  it("refuses to divide by a frame that has no size", () => {
    expect(getScanScale(0, 0)).toBe(1);
    expect(getScanScale(Number.NaN, 10)).toBe(1);
  });

  it("decodes the shrunk frame rather than the full one", async () => {
    const { drawn } = stubCanvas();
    decode.mockReturnValue(null);

    await createCardDetector()!.detect(frame);

    expect(drawn).toEqual([{ width: 640, height: 360 }]);
  });
});

describe("turning what the decoder saw into something the session understands", () => {
  it("builds no detector without a canvas context", () => {
    stubCanvas({ context: false });
    expect(createCardDetector()).toBeNull();
  });

  /*
   * The reason this file stopped using the browser's own BarcodeDetector. Its corner
   * points arrive ordered by the image, so the first edge pointed rightwards however the
   * card was turned and every child was recorded as answering A. The finder patterns are
   * the code's own, so the line between them turns with the paper.
   */
  it("hands on the finder patterns, which are what carry the rotation", async () => {
    stubCanvas();
    const topLeftFinderPattern = { x: 10, y: 10 };
    const topRightFinderPattern = { x: 90, y: 10 };
    decode.mockReturnValue({
      data: "KIKIRIA:1:AAAAAA:BBBBBB",
      location: {
        topLeftFinderPattern,
        topRightFinderPattern,
        bottomLeftFinderPattern: { x: 10, y: 90 },
        topLeftCorner: { x: 0, y: 0 },
        topRightCorner: { x: 100, y: 0 }
      }
    });

    const detected = await createCardDetector()!.detect(frame);

    expect(detected).toEqual([
      {
        payload: "KIKIRIA:1:AAAAAA:BBBBBB",
        corners: [topLeftFinderPattern, topRightFinderPattern]
      }
    ]);
  });

  it("reports nothing when the frame holds no code", async () => {
    stubCanvas();
    decode.mockReturnValue(null);

    await expect(createCardDetector()!.detect(frame)).resolves.toEqual([]);
  });

  it("reports nothing when the source has no readable size yet", async () => {
    stubCanvas();
    decode.mockReturnValue(null);

    await expect(createCardDetector()!.detect({} as CanvasImageSource)).resolves.toEqual([]);
    expect(decode).not.toHaveBeenCalled();
  });

  /*
   * A blurred or half-lit frame is ordinary while a camera pans across a room. Throwing
   * would end the sweep; an empty frame just means the teacher keeps walking.
   */
  it("treats an unreadable frame as an empty one rather than an error", async () => {
    stubCanvas();
    decode.mockImplementation(() => {
      throw new Error("frame not ready");
    });

    await expect(createCardDetector()!.detect(frame)).resolves.toEqual([]);
  });
});

describe("asking for the camera", () => {
  it("says unsupported when the device has no camera API at all", async () => {
    vi.stubGlobal("navigator", {});
    await expect(openCamera()).resolves.toEqual({ kind: "failed", reason: "unsupported" });
  });

  /*
   * The reasons stay apart because the way out of each one differs: a refusal can be
   * granted, a missing camera means using another device. "Something went wrong" would
   * leave a teacher stuck in front of a class.
   */
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

  it("asks for the back camera, which is the one pointed at a classroom", async () => {
    const getUserMedia = vi.fn().mockResolvedValue("stream");
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    await expect(openCamera()).resolves.toEqual({ kind: "ready", stream: "stream" });
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
  });
});

describe("giving the camera back", () => {
  it("stops every track, so a light is not left on all morning", () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream;

    closeCamera(stream);

    expect(stop).toHaveBeenCalledTimes(2);
  });

  it("does nothing when there was never a camera to close", () => {
    expect(() => closeCamera(null)).not.toThrow();
  });
});
