import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canDetectCodes,
  canOpenCamera,
  closeCamera,
  createCardDetector,
  openCamera
} from "./cardScanner";

afterEach(() => {
  vi.unstubAllGlobals();
});

function withDetector(detect: (source: unknown) => Promise<unknown>) {
  class FakeDetector {
    detect = detect;
  }
  vi.stubGlobal("window", { BarcodeDetector: FakeDetector });
}

describe("knowing what this browser can do before promising it", () => {
  it("reports no code reading when the browser has none", () => {
    vi.stubGlobal("window", {});
    expect(canDetectCodes()).toBe(false);
  });

  it("reports no code reading when the name exists but is not usable", () => {
    vi.stubGlobal("window", { BarcodeDetector: "yes" });
    expect(canDetectCodes()).toBe(false);
  });

  it("reports code reading when the browser provides it", () => {
    withDetector(async () => []);
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

describe("turning what the decoder saw into something the session understands", () => {
  it("builds no detector when the browser cannot read codes", () => {
    vi.stubGlobal("window", {});
    expect(createCardDetector()).toBeNull();
  });

  it("builds no detector when construction itself fails", () => {
    class Hostile {
      constructor() {
        throw new Error("qr_code unsupported");
      }
    }
    vi.stubGlobal("window", { BarcodeDetector: Hostile });
    expect(createCardDetector()).toBeNull();
  });

  it("passes through the decoded text and the corners that carry the orientation", async () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: 8, y: 8 },
      { x: 0, y: 8 }
    ];
    withDetector(async () => [{ rawValue: "KIKIRIA:1:AAAAAA:BBBBBB", cornerPoints: corners }]);

    const detected = await createCardDetector()!.detect({} as CanvasImageSource);

    expect(detected).toEqual([{ payload: "KIKIRIA:1:AAAAAA:BBBBBB", corners }]);
  });

  it("survives a decoder that reports no corners, leaving the answer undecidable", async () => {
    withDetector(async () => [{ rawValue: "KIKIRIA:1:AAAAAA:BBBBBB", cornerPoints: undefined }]);

    const detected = await createCardDetector()!.detect({} as CanvasImageSource);

    expect(detected).toEqual([{ payload: "KIKIRIA:1:AAAAAA:BBBBBB", corners: [] }]);
  });

  /*
   * A blurred or half-lit frame is ordinary while a camera pans across a room. Throwing
   * would end the sweep; an empty frame just means the teacher keeps walking.
   */
  it("treats an unreadable frame as an empty one rather than an error", async () => {
    withDetector(async () => {
      throw new Error("frame not ready");
    });

    await expect(createCardDetector()!.detect({} as CanvasImageSource)).resolves.toEqual([]);
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
