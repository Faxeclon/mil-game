import { describe, expect, it } from "vitest";
import { createClassSet, encodeCardPayload, type TeacherClassSet } from "./classCards";
import {
  applyDetection,
  closeAnswers,
  CONFIRMATIONS_NEEDED,
  createScanSession,
  getPendingCards,
  getTally,
  startNextQuestion,
  type CardDetection,
  type ScanSession
} from "./scanSession";

/**
 * A deterministic set, so a failure points at the rules and never at the dice.
 *
 * The offset exists so two sets can be built that are genuinely different print runs;
 * sharing a seed would give them the same class token and quietly make them one class.
 */
function makeSet(students = 3, offset = 0): TeacherClassSet {
  let seed = offset;
  return createClassSet(students, "2026-08-07", "5to B", () => {
    seed += 0.137;
    return seed % 1;
  });
}

const upright = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 }
];
const upsideDown = [
  { x: 10, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: -10 },
  { x: 10, y: -10 }
];
const sideways = [
  { x: 0, y: 0 },
  { x: 0, y: 10 },
  { x: -10, y: 10 },
  { x: -10, y: 0 }
];

function detect(set: TeacherClassSet, cardIndex: number, corners: readonly unknown[]): CardDetection {
  return { payload: encodeCardPayload(set.classToken, set.cards[cardIndex].cardId), corners };
}

/** Sees the same card the same way as many times as the rules ask for. */
function seeUntilConfirmed(session: ScanSession, set: TeacherClassSet, index: number, corners: readonly unknown[]) {
  let current = session;
  let last = applyDetection(current, set, detect(set, index, corners));
  current = last.session;
  for (let seen = 1; seen < CONFIRMATIONS_NEEDED; seen += 1) {
    last = applyDetection(current, set, detect(set, index, corners));
    current = last.session;
  }
  return last;
}

describe("holding a card up", () => {
  it("waits for the reading to hold still before recording anything", () => {
    const set = makeSet();
    const first = applyDetection(createScanSession(set), set, detect(set, 0, upright));

    expect(first.outcome.kind).toBe("pending");
    expect(getTally(first.session, set).answered).toBe(0);
  });

  it("records the answer once the same reading repeats", () => {
    const set = makeSet();
    const result = seeUntilConfirmed(createScanSession(set), set, 0, upright);

    expect(result.outcome).toMatchObject({ kind: "recorded", answer: "A" });
    expect(getTally(result.session, set)).toMatchObject({ a: 1, b: 0, answered: 1, pending: 2 });
  });

  it("does not count the same child twice when their card stays in view", () => {
    const set = makeSet();
    const confirmed = seeUntilConfirmed(createScanSession(set), set, 0, upright);
    const again = applyDetection(confirmed.session, set, detect(set, 0, upright));
    const andAgain = applyDetection(again.session, set, detect(set, 0, upright));

    expect(andAgain.outcome.kind).toBe("unchanged");
    expect(getTally(andAgain.session, set).answered).toBe(1);
  });

  it("lets a child turn their card over while the question is open", () => {
    const set = makeSet();
    const first = seeUntilConfirmed(createScanSession(set), set, 0, upright);
    const second = seeUntilConfirmed(first.session, set, 0, upsideDown);

    expect(second.outcome).toMatchObject({ kind: "changed", answer: "B" });
    expect(getTally(second.session, set)).toMatchObject({ a: 0, b: 1, answered: 1 });
  });
});

describe("what the camera refuses to guess at", () => {
  it("names the card held sideways instead of picking a side for them", () => {
    const set = makeSet();
    const result = applyDetection(createScanSession(set), set, detect(set, 1, sideways));

    expect(result.outcome).toMatchObject({ kind: "ambiguous" });
    expect(getTally(result.session, set).answered).toBe(0);
  });

  /*
   * A card waved around is seen at every angle. If sideways glimpses counted towards
   * confidence, whichever side happened to appear twice would win - so they reset it.
   */
  it("does not let a waved card confirm itself through sideways glimpses", () => {
    const set = makeSet();
    let session = createScanSession(set);

    for (const corners of [upright, sideways, upright, sideways]) {
      session = applyDetection(session, set, detect(set, 0, corners)).session;
    }

    expect(getTally(session, set).answered).toBe(0);
  });

  it("refuses a card printed for another class", () => {
    const set = makeSet();
    const other = makeSet(2, 0.41);
    expect(other.classToken).not.toBe(set.classToken);

    const result = applyDetection(createScanSession(set), set, {
      payload: encodeCardPayload(other.classToken, other.cards[0].cardId),
      corners: upright
    });

    expect(result.outcome.kind).toBe("foreign");
    expect(getTally(result.session, set).answered).toBe(0);
  });

  it("ignores anything that is not one of our cards", () => {
    const set = makeSet();
    const session = createScanSession(set);

    for (const payload of ["https://example.com", "", "KIKIRIA:9:AAAAAA:BBBBBB", null, 42]) {
      expect(applyDetection(session, set, { payload, corners: upright }).outcome.kind).toBe("unknown");
    }
  });
});

describe("closing the question", () => {
  it("freezes every answer, however long the camera keeps looking", () => {
    const set = makeSet();
    const answered = seeUntilConfirmed(createScanSession(set), set, 0, upright);
    const closed = closeAnswers(answered.session);

    const after = seeUntilConfirmed(closed, set, 0, upsideDown);

    expect(after.outcome.kind).toBe("closed");
    expect(getTally(after.session, set)).toMatchObject({ a: 1, b: 0 });
  });

  it("accepts no new card once closed", () => {
    const set = makeSet();
    const closed = closeAnswers(createScanSession(set));
    const result = seeUntilConfirmed(closed, set, 2, upright);

    expect(result.outcome.kind).toBe("closed");
    expect(getTally(result.session, set).answered).toBe(0);
  });

  it("clears the board for the next question without losing the class", () => {
    const set = makeSet();
    const answered = seeUntilConfirmed(createScanSession(set), set, 0, upright);
    const next = startNextQuestion(closeAnswers(answered.session));

    expect(next.status).toBe("open");
    expect(next.classToken).toBe(set.classToken);
    expect(getTally(next, set)).toMatchObject({ answered: 0, pending: set.cards.length });
  });
});

describe("what the teacher sees while walking the room", () => {
  it("lists who is still missing, by their printed number", () => {
    const set = makeSet(4);
    const first = seeUntilConfirmed(createScanSession(set), set, 0, upright);
    const second = seeUntilConfirmed(first.session, set, 2, upsideDown);

    expect(getPendingCards(second.session, set).map((card) => card.number)).toEqual([2, 4]);
  });

  it("counts each side and what is left", () => {
    const set = makeSet(4);
    let session = createScanSession(set);
    session = seeUntilConfirmed(session, set, 0, upright).session;
    session = seeUntilConfirmed(session, set, 1, upright).session;
    session = seeUntilConfirmed(session, set, 2, upsideDown).session;

    expect(getTally(session, set)).toEqual({ a: 2, b: 1, answered: 3, pending: 1 });
  });
});
