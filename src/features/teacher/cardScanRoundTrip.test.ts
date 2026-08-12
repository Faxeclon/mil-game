import QRCode from "qrcode";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { describe, expect, it } from "vitest";
import { getCardOrientationFromAngle } from "./cardOrientation";

/**
 * The one test that would have caught the bug.
 *
 * Everything else in this feature is checked against invented corner points, which is
 * exactly how a card reader can pass its whole suite while recording every child as
 * answering A. Here a real QR is generated, turned on the spot, and decoded by the real
 * library, and the answer has to change with the paper.
 *
 * No camera and no mocks: the pixels are built here, so this runs anywhere the rest of the
 * suite does.
 */

type Frame = { data: Uint8ClampedArray; width: number; height: number };

const MODULE_PIXELS = 4;
/** The margin a QR needs around it to be found at all. */
const QUIET_MODULES = 4;

/** Paints a real QR code into RGBA pixels, the way a camera would see it on paper. */
function renderQr(text: string): Frame {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const side = modules.size + QUIET_MODULES * 2;
  const width = side * MODULE_PIXELS;
  const height = width;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const moduleX = Math.floor(x / MODULE_PIXELS) - QUIET_MODULES;
      const moduleY = Math.floor(y / MODULE_PIXELS) - QUIET_MODULES;
      const inside =
        moduleX >= 0 && moduleY >= 0 && moduleX < modules.size && moduleY < modules.size;
      const dark = inside && modules.data[moduleY * modules.size + moduleX] === 1;
      const value = dark ? 0 : 255;
      const offset = (y * width + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  return { data, width, height };
}

/** Turns the paper in front of the camera. Only right angles, as a card is held. */
function rotate(frame: Frame, quarterTurns: number): Frame {
  const turns = ((quarterTurns % 4) + 4) % 4;
  if (turns === 0) return frame;

  const swap = turns % 2 === 1;
  const width = swap ? frame.height : frame.width;
  const height = swap ? frame.width : frame.height;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const [nextX, nextY] =
        turns === 1
          ? [frame.height - 1 - y, x]
          : turns === 2
            ? [frame.width - 1 - x, frame.height - 1 - y]
            : [y, frame.width - 1 - x];

      const from = (y * frame.width + x) * 4;
      const to = (nextY * width + nextX) * 4;
      data[to] = frame.data[from];
      data[to + 1] = frame.data[from + 1];
      data[to + 2] = frame.data[from + 2];
      data[to + 3] = 255;
    }
  }

  return { data, width, height };
}

/** Puts several paper cards into one camera frame, with a white gap between them. */
function combine(...frames: Frame[]): Frame {
  const gap = MODULE_PIXELS * 8;
  const width = frames.reduce((total, frame) => total + frame.width, gap * Math.max(0, frames.length - 1));
  const height = Math.max(...frames.map((frame) => frame.height));
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  let offsetX = 0;

  for (const frame of frames) {
    for (let y = 0; y < frame.height; y += 1) {
      const sourceStart = y * frame.width * 4;
      const targetStart = (y * width + offsetX) * 4;
      data.set(frame.data.subarray(sourceStart, sourceStart + frame.width * 4), targetStart);
    }
    offsetX += frame.width + gap;
  }

  return { data, width, height };
}

/** What the production scanner does with a frame, minus the camera and canvas. */
async function read(frame: Frame) {
  const code = await readWithZxing(frame);
  if (!code) return null;
  return {
    payload: code.text,
    orientation: getCardOrientationFromAngle(code.orientation)
  };
}

const PAYLOAD = "KIKIRIA:7:A1B2C3:D4E5F6";
const readerWasm = readFileSync(resolve(process.cwd(), "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"));
const readerWasmBinary = readerWasm.buffer.slice(
  readerWasm.byteOffset,
  readerWasm.byteOffset + readerWasm.byteLength
) as ArrayBuffer;

prepareZXingModule({
  // The integration test deliberately uses the installed WASM, never the package CDN.
  overrides: { wasmBinary: readerWasmBinary },
  fireImmediately: false
});

async function readWithZxing(frame: Frame) {
  const [result] = await readBarcodes(frame as unknown as ImageData, {
    formats: ["QRCode"],
    tryHarder: true,
    maxNumberOfSymbols: 12
  });
  return result;
}

describe("a real card, actually turned", () => {
  it("proves ZXing reports the per-card rotations used for A and B", async () => {
    const upright = await readWithZxing(renderQr(PAYLOAD));
    const upsideDown = await readWithZxing(rotate(renderQr(PAYLOAD), 2));

    expect(upright?.text).toBe(PAYLOAD);
    expect(upright?.orientation).toBe(0);
    expect(upsideDown?.text).toBe(PAYLOAD);
    expect(upsideDown?.orientation).toBe(180);
  });

  it("reads two separate cards from one composed camera frame", async () => {
    const first = "KIKIRIA:1:AAAAAA:BBBBBB";
    const second = "KIKIRIA:1:AAAAAA:CCCCCC";
    const results = await readBarcodes(combine(renderQr(first), rotate(renderQr(second), 2)) as unknown as ImageData, {
      formats: ["QRCode"],
      tryHarder: true,
      maxNumberOfSymbols: 12
    });

    expect(results.map((result) => result.text).sort()).toEqual([first, second]);
    expect(results.find((result) => result.text === first)?.orientation).toBe(0);
    expect(results.find((result) => result.text === second)?.orientation).toBe(180);
  });

  it("decodes the same child whichever way the card is held", async () => {
    const upright = await read(renderQr(PAYLOAD));
    const upsideDown = await read(rotate(renderQr(PAYLOAD), 2));

    expect(upright?.payload).toBe(PAYLOAD);
    expect(upsideDown?.payload).toBe(PAYLOAD);
  });

  /*
   * The failure this replaced: with the browser's own detector the corner points arrived
   * ordered by the image, so both of these came back "A" and every child in the room was
   * recorded as answering the same thing.
   */
  it("answers A upright and B upside down", async () => {
    expect((await read(renderQr(PAYLOAD)))?.orientation).toBe("A");
    expect((await read(rotate(renderQr(PAYLOAD), 2)))?.orientation).toBe("B");
  });

  it("refuses a card held sideways instead of guessing", async () => {
    expect((await read(rotate(renderQr(PAYLOAD), 1)))?.orientation).toBe("ambiguous");
    expect((await read(rotate(renderQr(PAYLOAD), 3)))?.orientation).toBe("ambiguous");
  });

  /* Two cards in a class must not answer alike just because both were held upright. */
  it("keeps each card's own identity while reading its orientation", async () => {
    const first = await read(renderQr("KIKIRIA:1:AAAAAA:BBBBBB"));
    const second = await read(rotate(renderQr("KIKIRIA:2:CCCCCC:DDDDDD"), 2));

    expect(first?.payload).toBe("KIKIRIA:1:AAAAAA:BBBBBB");
    expect(first?.orientation).toBe("A");
    expect(second?.payload).toBe("KIKIRIA:2:CCCCCC:DDDDDD");
    expect(second?.orientation).toBe("B");
  });
});
