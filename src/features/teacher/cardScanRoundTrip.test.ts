import jsQR from "jsqr";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";
import { getCardOrientation } from "./cardOrientation";

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

/** What the scanner does with a frame, minus the camera and the canvas. */
function read(frame: Frame) {
  const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
  if (!code) return null;
  return {
    payload: code.data,
    orientation: getCardOrientation([
      code.location.topLeftFinderPattern,
      code.location.topRightFinderPattern
    ])
  };
}

const PAYLOAD = "KIKIRIA:7:A1B2C3:D4E5F6";

describe("a real card, actually turned", () => {
  it("decodes the same child whichever way the card is held", () => {
    const upright = read(renderQr(PAYLOAD));
    const upsideDown = read(rotate(renderQr(PAYLOAD), 2));

    expect(upright?.payload).toBe(PAYLOAD);
    expect(upsideDown?.payload).toBe(PAYLOAD);
  });

  /*
   * The failure this replaced: with the browser's own detector the corner points arrived
   * ordered by the image, so both of these came back "A" and every child in the room was
   * recorded as answering the same thing.
   */
  it("answers A upright and B upside down", () => {
    expect(read(renderQr(PAYLOAD))?.orientation).toBe("A");
    expect(read(rotate(renderQr(PAYLOAD), 2))?.orientation).toBe("B");
  });

  it("refuses a card held sideways instead of guessing", () => {
    expect(read(rotate(renderQr(PAYLOAD), 1))?.orientation).toBe("ambiguous");
    expect(read(rotate(renderQr(PAYLOAD), 3))?.orientation).toBe("ambiguous");
  });

  /* Two cards in a class must not answer alike just because both were held upright. */
  it("keeps each card's own identity while reading its orientation", () => {
    const first = read(renderQr("KIKIRIA:1:AAAAAA:BBBBBB"));
    const second = read(rotate(renderQr("KIKIRIA:2:CCCCCC:DDDDDD"), 2));

    expect(first?.payload).toBe("KIKIRIA:1:AAAAAA:BBBBBB");
    expect(first?.orientation).toBe("A");
    expect(second?.payload).toBe("KIKIRIA:2:CCCCCC:DDDDDD");
    expect(second?.orientation).toBe("B");
  });
});
