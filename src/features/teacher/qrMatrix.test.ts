import { describe, expect, it } from "vitest";
import { createClassSet, encodeCardPayload, parseCardPayload } from "./classCards";
import { createQrMatrix, getQrViewBox, QR_QUIET_ZONE } from "./qrMatrix";

describe("drawing a card's code", () => {
  it("produces a square grid with something drawn in it", () => {
    const matrix = createQrMatrix(encodeCardPayload("ABC123", "XYZ789"));

    expect(matrix.size).toBeGreaterThan(20);
    expect(matrix.path.length).toBeGreaterThan(100);
    expect(matrix.path.startsWith("M")).toBe(true);
  });

  it("draws every card of a set without failing on any of them", () => {
    const set = createClassSet(40, "2026-08-05");

    for (const card of set.cards) {
      const matrix = createQrMatrix(encodeCardPayload(set.classToken, card.cardId));
      expect(matrix.size, `card ${card.number}`).toBeGreaterThan(0);
    }
  });

  it("gives different cards different codes", () => {
    const set = createClassSet(3, "2026-08-05");
    const paths = set.cards.map((card) => createQrMatrix(encodeCardPayload(set.classToken, card.cardId)).path);

    expect(new Set(paths).size).toBe(3);
  });

  it("is the same drawing every time, so a reprint matches the first print", () => {
    const payload = encodeCardPayload("ABC123", "XYZ789");

    expect(createQrMatrix(payload)).toEqual(createQrMatrix(payload));
  });

  it("leaves the quiet zone a printed code needs to be readable", () => {
    const matrix = createQrMatrix(encodeCardPayload("ABC123", "XYZ789"));
    const side = matrix.size + QR_QUIET_ZONE * 2;

    expect(getQrViewBox(matrix)).toBe(`${-QR_QUIET_ZONE} ${-QR_QUIET_ZONE} ${side} ${side}`);
  });

  it("encodes a payload that reads back as the same card", () => {
    const set = createClassSet(1, "2026-08-05");
    const payload = encodeCardPayload(set.classToken, set.cards[0].cardId);

    expect(createQrMatrix(payload).size).toBeGreaterThan(0);
    expect(parseCardPayload(payload)).toEqual({ classToken: set.classToken, cardId: set.cards[0].cardId });
  });
});
