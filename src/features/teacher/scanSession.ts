import { findCardInSet, parseCardPayload, type CardAnswer, type TeacherCard, type TeacherClassSet } from "./classCards";
import { getCardOrientation, getCardOrientationFromAngle } from "./cardOrientation";

/**
 * One question, one classroom, one camera sweeping the room.
 *
 * The teacher walks between the desks while children hold their cards up, and answers
 * accumulate as cards come into view. That is the shape the teacher-mode brief asks for:
 * not a perfect photograph of the whole class, but a walk that ends when nobody is left.
 *
 * Everything here is pure. The camera hands in what it saw and gets back the new session,
 * which means the rules that matter - not counting a child twice, refusing to guess at a
 * sideways card, freezing answers once the question closes - are testable without a lens.
 *
 * Nothing identifies a child. A card is a number and an opaque token, and the frames the
 * camera produced are never part of this state.
 */
export type ScanStatus = "open" | "closed";

/** How many consistent readings a card needs before its answer is taken as meant. */
export const CONFIRMATIONS_NEEDED = 2;

type Streak = { answer: CardAnswer; count: number };

export type ScanSession = {
  /** The print run this session accepts. A card from another set is refused, not counted. */
  classToken: string;
  status: ScanStatus;
  /** Confirmed answers, by card. */
  answers: Readonly<Record<string, CardAnswer>>;
  /** Readings seen but not yet confirmed. Never shown as an answer. */
  streaks: Readonly<Record<string, Streak>>;
};

/**
 * What the camera saw in one frame.
 *
 * The payload is the decoded text and the corners are where the code sat in the image.
 * Both are needed and neither is enough: the text says who, the corners say which way up.
 */
export type CardDetection = {
  payload: unknown;
  corners: readonly unknown[];
  /** A decoder-measured rotation for this individual QR, when available. */
  orientation?: unknown;
};

export type ScanOutcome =
  /** First confirmed answer for this card. */
  | { kind: "recorded"; card: TeacherCard; answer: CardAnswer }
  /** They turned the card over before the question closed, which is allowed. */
  | { kind: "changed"; card: TeacherCard; answer: CardAnswer }
  /** Seen again, saying the same thing. Not a second answer. */
  | { kind: "unchanged"; card: TeacherCard; answer: CardAnswer }
  /** Read once; waiting for it to hold still before believing it. */
  | { kind: "pending"; card: TeacherCard }
  /** Held sideways. The teacher is told which card, so they can ask that child. */
  | { kind: "ambiguous"; card: TeacherCard }
  /** A real Kikiria card, but printed for a different class. */
  | { kind: "foreign" }
  /** Not one of our cards, or unreadable. */
  | { kind: "unknown" }
  /** The question is closed; nothing changes any more. */
  | { kind: "closed" };

export type ScanResult = { session: ScanSession; outcome: ScanOutcome };

export function createScanSession(set: TeacherClassSet): ScanSession {
  return { classToken: set.classToken, status: "open", answers: {}, streaks: {} };
}

function withoutStreak(streaks: ScanSession["streaks"], cardId: string): ScanSession["streaks"] {
  if (!(cardId in streaks)) return streaks;
  const next = { ...streaks };
  delete next[cardId];
  return next;
}

/**
 * Folds one detection into the session.
 *
 * The order of the checks is the order of the questions a teacher would ask: is the
 * question still open, is this one of ours, is it from this class, and only then which way
 * up is it. A card that fails an earlier question never reaches a later one.
 */
export function applyDetection(
  session: ScanSession,
  set: TeacherClassSet,
  detection: CardDetection
): ScanResult {
  if (session.status === "closed") return { session, outcome: { kind: "closed" } };

  const identity = parseCardPayload(detection.payload);
  if (!identity) return { session, outcome: { kind: "unknown" } };
  if (identity.classToken !== session.classToken) return { session, outcome: { kind: "foreign" } };

  const card = findCardInSet(set, identity);
  if (!card) return { session, outcome: { kind: "unknown" } };

  const orientation = detection.orientation === undefined
    ? getCardOrientation(detection.corners)
    : getCardOrientationFromAngle(detection.orientation);
  if (orientation === "ambiguous") {
    // A sideways glimpse must not count towards confidence, or a card waved about would
    // eventually confirm whichever side happened to be seen twice.
    return {
      session: { ...session, streaks: withoutStreak(session.streaks, card.cardId) },
      outcome: { kind: "ambiguous", card }
    };
  }

  const previous = session.streaks[card.cardId];
  const count = previous && previous.answer === orientation ? previous.count + 1 : 1;

  if (count < CONFIRMATIONS_NEEDED) {
    return {
      session: { ...session, streaks: { ...session.streaks, [card.cardId]: { answer: orientation, count } } },
      outcome: { kind: "pending", card }
    };
  }

  const settled = session.answers[card.cardId];
  const session_ = {
    ...session,
    answers: { ...session.answers, [card.cardId]: orientation },
    streaks: withoutStreak(session.streaks, card.cardId)
  };

  if (settled === orientation) return { session: session_, outcome: { kind: "unchanged", card, answer: orientation } };
  if (settled === undefined) return { session: session_, outcome: { kind: "recorded", card, answer: orientation } };
  return { session: session_, outcome: { kind: "changed", card, answer: orientation } };
}

/**
 * Applies every distinct card a camera frame found, keeping confidence isolated by card.
 * Each call still goes through `applyDetection`, so a row of cards cannot share a streak.
 */
export function applyDetections(
  session: ScanSession,
  set: TeacherClassSet,
  detections: readonly CardDetection[]
): { session: ScanSession; outcomes: ScanOutcome[] } {
  let next = session;
  const outcomes: ScanOutcome[] = [];

  for (const detection of detections) {
    const applied = applyDetection(next, set, detection);
    next = applied.session;
    outcomes.push(applied.outcome);
  }

  return { session: next, outcomes };
}

/**
 * Closes the question. After this nothing moves, which is what makes the tally a result
 * rather than a running total, and what lets the teacher reveal the correct answer.
 */
export function closeAnswers(session: ScanSession): ScanSession {
  return session.status === "closed" ? session : { ...session, status: "closed", streaks: {} };
}

/** Clears the board for the next question, keeping the same class and the same cards. */
export function startNextQuestion(session: ScanSession): ScanSession {
  return { classToken: session.classToken, status: "open", answers: {}, streaks: {} };
}

export type ScanTally = { a: number; b: number; answered: number; pending: number };

export function getTally(session: ScanSession, set: TeacherClassSet): ScanTally {
  let a = 0;
  let b = 0;
  for (const card of set.cards) {
    const answer = session.answers[card.cardId];
    if (answer === "A") a += 1;
    else if (answer === "B") b += 1;
  }
  return { a, b, answered: a + b, pending: Math.max(0, set.cards.length - a - b) };
}

/** The numbers the teacher still has to walk to, in the order they were handed out. */
export function getPendingCards(session: ScanSession, set: TeacherClassSet): TeacherCard[] {
  return set.cards.filter((card) => session.answers[card.cardId] === undefined);
}

export function getAnswer(session: ScanSession, cardId: string): CardAnswer | undefined {
  return session.answers[cardId];
}
