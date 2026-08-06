/**
 * Printed answer cards for a classroom where the children have no phones.
 *
 * One device, the teacher's, does the reading. Every student gets a paper card with a
 * unique code and turns it so their answer faces up. That is the whole point: a class of
 * thirty can play with a single camera, no accounts and no connection, which is the only
 * shape that fits the schools this project is for.
 *
 * The card carries an opaque token and nothing else. No name, no age, no school, no
 * answer and no score - anyone who finds a card on the floor learns nothing from it.
 */
export const CARD_PAYLOAD_PREFIX = "KIKIRIA";
export const CARD_PAYLOAD_VERSION = 1;

/** A classroom, not a register: enough for a large class, small enough to print. */
export const MAX_STUDENTS = 40;
export const MIN_STUDENTS = 1;

export type TeacherCard = {
  /** Opaque token, unique inside its set. Printed as a QR, never shown as text. */
  cardId: string;
  /** The big number on the card, so a teacher can call it out loud. */
  number: number;
};

export type TeacherClassSet = {
  /** Identifies the print run, so a card from last term is recognised as foreign. */
  classToken: string;
  /** Optional and local: "5to B". Never a child's name. */
  name: string | null;
  createdOn: string;
  cards: TeacherCard[];
};

/** The answer a card shows, decided by which way up it is held. */
export type CardAnswer = "A" | "B";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const tokenPattern = /^[A-Z0-9]{6}$/;
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function isCardToken(value: unknown): value is string {
  return typeof value === "string" && tokenPattern.test(value);
}

/**
 * Six characters from an alphabet with no O/0 or I/1, because these tokens end up on
 * paper and a teacher may have to read one out when a card will not scan.
 */
export function createToken(random: () => number = Math.random): string {
  let token = "";
  for (let index = 0; index < 6; index += 1) {
    const draw = random();
    const safeDraw = Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 0.999_999) : 0;
    token += TOKEN_ALPHABET[Math.floor(safeDraw * TOKEN_ALPHABET.length)];
  }
  return token;
}

/**
 * A token built from a number rather than from chance.
 *
 * It exists for the case where the random source keeps returning the same value: drawing
 * again would repeat forever, so uniqueness is taken from the position instead. Bounded
 * by construction, which is what stops the generator hanging on a degenerate source.
 */
function deriveToken(seed: number): string {
  let value = Math.abs(Math.trunc(seed)) + 1;
  let token = "";
  for (let index = 0; index < 6; index += 1) {
    token = TOKEN_ALPHABET[value % TOKEN_ALPHABET.length] + token;
    value = Math.floor(value / TOKEN_ALPHABET.length);
  }
  return token;
}

export function clampStudentCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_STUDENTS;
  return Math.min(Math.max(Math.trunc(value), MIN_STUDENTS), MAX_STUDENTS);
}

/**
 * Builds a printable set. Every card is unique inside its set, and the set itself carries
 * a token so a card printed for another class is spotted rather than silently counted.
 */
export function createClassSet(
  studentCount: number,
  createdOn: string,
  name: string | null = null,
  random: () => number = Math.random
): TeacherClassSet {
  const count = clampStudentCount(studentCount);
  const classToken = createToken(random);
  const used = new Set<string>();
  const cards: TeacherCard[] = [];

  for (let number = 1; number <= count; number += 1) {
    // A collision inside one set would make two children the same student. Redraw a few
    // times, then fall back to a derived token: a random source that repeats itself must
    // produce a worse set of tokens, never an endless loop.
    let cardId = createToken(random);
    for (let attempt = 0; attempt < 8 && used.has(cardId); attempt += 1) {
      cardId = createToken(random);
    }
    for (let salt = number; used.has(cardId) && salt < number + MAX_STUDENTS + 1; salt += 1) {
      cardId = deriveToken(salt);
    }

    used.add(cardId);
    cards.push({ cardId, number });
  }

  return { classToken, name: name?.trim() || null, createdOn, cards };
}

/**
 * What the QR encodes. Only identity: which print run, and which card in it.
 *
 * Deliberately not the answer. A reader normalises rotation, so the code cannot tell A
 * from B; that comes from the printed frame around it, which is why the payload has no
 * business carrying it.
 */
export function encodeCardPayload(classToken: string, cardId: string): string {
  return `${CARD_PAYLOAD_PREFIX}:${CARD_PAYLOAD_VERSION}:${classToken}:${cardId}`;
}

export type CardIdentity = { classToken: string; cardId: string };

/** Reads a scanned code. Anything that is not one of our cards is rejected outright. */
export function parseCardPayload(payload: unknown): CardIdentity | null {
  if (typeof payload !== "string") return null;
  const parts = payload.trim().split(":");
  if (parts.length !== 4) return null;

  const [prefix, version, classToken, cardId] = parts;
  if (prefix !== CARD_PAYLOAD_PREFIX || version !== String(CARD_PAYLOAD_VERSION)) return null;
  if (!isCardToken(classToken) || !isCardToken(cardId)) return null;
  return { classToken, cardId };
}

/** Finds the student a scanned card belongs to, or nothing when it is from another set. */
export function findCardInSet(set: TeacherClassSet, identity: CardIdentity): TeacherCard | undefined {
  if (identity.classToken !== set.classToken) return undefined;
  return set.cards.find((card) => card.cardId === identity.cardId);
}

function parseCard(value: unknown): TeacherCard | undefined {
  if (!isRecord(value) || !isCardToken(value.cardId)) return undefined;
  if (typeof value.number !== "number" || !Number.isFinite(value.number) || value.number < 1) return undefined;
  return { cardId: value.cardId, number: Math.trunc(value.number) };
}

/** Rebuilds a stored set, dropping anything unreadable rather than guessing at it. */
export function parseClassSet(value: unknown): TeacherClassSet | null {
  if (!isRecord(value) || !isCardToken(value.classToken)) return null;
  if (typeof value.createdOn !== "string" || !Array.isArray(value.cards)) return null;

  const seen = new Set<string>();
  const cards: TeacherCard[] = [];
  for (const entry of value.cards) {
    const card = parseCard(entry);
    if (!card || seen.has(card.cardId)) continue;
    seen.add(card.cardId);
    cards.push(card);
  }
  if (cards.length === 0) return null;

  return {
    classToken: value.classToken,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : null,
    createdOn: value.createdOn,
    cards
  };
}

/** How many cards fit on one printed page, so the sheets can be cut apart cleanly. */
export const CARDS_PER_PAGE = 4;

export function splitIntoPages(cards: readonly TeacherCard[]): TeacherCard[][] {
  const pages: TeacherCard[][] = [];
  for (let index = 0; index < cards.length; index += CARDS_PER_PAGE) {
    pages.push(cards.slice(index, index + CARDS_PER_PAGE));
  }
  return pages;
}
