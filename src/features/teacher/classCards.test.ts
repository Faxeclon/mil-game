import { describe, expect, it } from "vitest";
import {
  CARDS_PER_SHEET,
  clampStudentCount,
  countSheets,
  createClassSet,
  createToken,
  encodeCardPayload,
  findCardInSet,
  isCardToken,
  MAX_STUDENTS,
  parseCardPayload,
  parseClassSet
} from "./classCards";

/** A predictable draw, so a generated set is the same in every run of the tests. */
function sequenceRandom(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

describe("the token printed on a card", () => {
  it("is six characters a teacher can read out loud", () => {
    const token = createToken(sequenceRandom([0.1, 0.4, 0.7, 0.2, 0.9, 0.5]));

    expect(isCardToken(token)).toBe(true);
    expect(token).toHaveLength(6);
  });

  it("avoids the characters that get confused on paper", () => {
    const tokens = Array.from({ length: 40 }, (_, index) => createToken(sequenceRandom([index / 40])));

    for (const token of tokens) {
      expect(token, token).not.toMatch(/[OI01]/);
    }
  });

  it("rejects anything that is not one of our tokens", () => {
    expect(isCardToken("ABC123")).toBe(true);
    expect(isCardToken("abc123")).toBe(false);
    expect(isCardToken("ABC12")).toBe(false);
    expect(isCardToken("")).toBe(false);
    expect(isCardToken(42)).toBe(false);
  });

  it("never breaks on a broken random source", () => {
    expect(isCardToken(createToken(() => Number.NaN))).toBe(true);
    expect(isCardToken(createToken(() => -3))).toBe(true);
    expect(isCardToken(createToken(() => 9))).toBe(true);
  });
});

describe("creating a set of cards", () => {
  it("makes exactly one card per student, numbered from one", () => {
    const set = createClassSet(25, "2026-08-05");

    expect(set.cards).toHaveLength(25);
    expect(set.cards[0].number).toBe(1);
    expect(set.cards[24].number).toBe(25);
  });

  it("never gives two students the same card", () => {
    const set = createClassSet(MAX_STUDENTS, "2026-08-05");
    const ids = set.cards.map((card) => card.cardId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps a class of any size within what can be printed", () => {
    expect(clampStudentCount(0)).toBe(1);
    expect(clampStudentCount(-5)).toBe(1);
    expect(clampStudentCount(500)).toBe(MAX_STUDENTS);
    expect(clampStudentCount(25.9)).toBe(25);
    expect(clampStudentCount(Number.NaN)).toBe(1);
    expect(createClassSet(999, "2026-08-05").cards).toHaveLength(MAX_STUDENTS);
  });

  it("keeps an optional class label and never a child's name", () => {
    expect(createClassSet(2, "2026-08-05", "  5to B  ").name).toBe("5to B");
    expect(createClassSet(2, "2026-08-05", "   ").name).toBeNull();
    expect(createClassSet(2, "2026-08-05").name).toBeNull();
  });

  it("survives a random source that keeps returning the same value", () => {
    const set = createClassSet(5, "2026-08-05", null, () => 0.5);

    // Colliding draws must not collapse five students into one card.
    expect(new Set(set.cards.map((card) => card.cardId)).size).toBe(5);
  });
});

describe("what the code carries", () => {
  it("encodes only which print run and which card", () => {
    const payload = encodeCardPayload("ABC123", "XYZ789");

    expect(payload).toBe("KIKIRIA:1:ABC123:XYZ789");
  });

  it("carries nothing personal and never the answer", () => {
    const set = createClassSet(3, "2026-08-05", "5to B");
    const payload = encodeCardPayload(set.classToken, set.cards[0].cardId);
    const [prefix, version, classToken, cardId] = payload.split(":");

    // Four parts and no fifth: there is nowhere to smuggle a name, a score or an answer.
    expect(payload.split(":")).toHaveLength(4);
    expect(prefix).toBe("KIKIRIA");
    expect(version).toBe("1");
    expect(classToken).toBe(set.classToken);
    expect(cardId).toBe(set.cards[0].cardId);
    expect(payload).not.toContain("5to B");
    expect(Object.keys(parseCardPayload(payload) ?? {})).toEqual(["classToken", "cardId"]);
  });

  it("reads back a code it produced", () => {
    const set = createClassSet(3, "2026-08-05");
    const identity = parseCardPayload(encodeCardPayload(set.classToken, set.cards[1].cardId));

    expect(identity).toEqual({ classToken: set.classToken, cardId: set.cards[1].cardId });
  });

  it("refuses anything that is not one of our cards", () => {
    expect(parseCardPayload("https://example.com")).toBeNull();
    expect(parseCardPayload("KIKIRIA:1:ABC123")).toBeNull();
    expect(parseCardPayload("OTHER:1:ABC123:XYZ789")).toBeNull();
    expect(parseCardPayload("KIKIRIA:9:ABC123:XYZ789")).toBeNull();
    expect(parseCardPayload("KIKIRIA:1:abc123:XYZ789")).toBeNull();
    expect(parseCardPayload(undefined)).toBeNull();
  });
});

describe("matching a scanned card to a student", () => {
  it("finds the student the card belongs to", () => {
    const set = createClassSet(4, "2026-08-05");
    const found = findCardInSet(set, { classToken: set.classToken, cardId: set.cards[2].cardId });

    expect(found?.number).toBe(3);
  });

  it("ignores a card printed for another class", () => {
    const set = createClassSet(4, "2026-08-05");
    const other = createClassSet(4, "2026-08-05");

    expect(findCardInSet(set, { classToken: other.classToken, cardId: other.cards[0].cardId })).toBeUndefined();
  });

  it("ignores a card that is not in this set at all", () => {
    const set = createClassSet(4, "2026-08-05");

    expect(findCardInSet(set, { classToken: set.classToken, cardId: "ZZZ999" })).toBeUndefined();
  });
});

describe("reading a stored set", () => {
  it("keeps a set it wrote", () => {
    const set = createClassSet(6, "2026-08-05", "5to B");

    expect(parseClassSet(JSON.parse(JSON.stringify(set)))).toEqual(set);
  });

  it("drops unreadable cards without losing the rest", () => {
    const set = createClassSet(3, "2026-08-05");
    const parsed = parseClassSet({
      ...set,
      cards: [set.cards[0], "broken", { cardId: "nope" }, { cardId: "ABC123", number: 0 }, set.cards[1]]
    });

    expect(parsed?.cards).toHaveLength(2);
  });

  it("drops a duplicated card rather than counting a student twice", () => {
    const set = createClassSet(2, "2026-08-05");
    const parsed = parseClassSet({ ...set, cards: [set.cards[0], set.cards[0], set.cards[1]] });

    expect(parsed?.cards).toHaveLength(2);
  });

  it("returns nothing for data it cannot use", () => {
    expect(parseClassSet(undefined)).toBeNull();
    expect(parseClassSet("broken")).toBeNull();
    expect(parseClassSet({ classToken: "ABC123", createdOn: "2026-08-05", cards: [] })).toBeNull();
    expect(parseClassSet({ classToken: "bad", createdOn: "2026-08-05", cards: [] })).toBeNull();
  });
});

describe("printing the cards", () => {
  it("gives each student a whole sheet, so nothing has to be cut", () => {
    expect(CARDS_PER_SHEET).toBe(1);
    expect(countSheets(25)).toBe(25);
    expect(countSheets(1)).toBe(1);
  });

  it("counts no sheets for no cards", () => {
    expect(countSheets(0)).toBe(0);
    expect(countSheets(-3)).toBe(0);
  });

  it("costs exactly one sheet per student, whatever the class size", () => {
    for (const size of [1, 7, 25, MAX_STUDENTS]) {
      expect(countSheets(createClassSet(size, "2026-08-05").cards.length), `${size}`).toBe(size);
    }
  });
});
