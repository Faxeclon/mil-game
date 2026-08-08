/**
 * Who a child plays with, and how they find each other.
 *
 * Nobody is browsable. There is no list of children to scroll through, no search and no
 * suggestions - a child cannot discover another child inside this game. The way in is a
 * code you were given by someone who chose to give it to you, and even that only lets you
 * ask: knowing a code is enough to knock, never enough to walk in. The person whose code
 * it is decides.
 *
 * Every player is an alias like "Roqui 47", never a real name, and the grown-up behind
 * them appears as a role, never as a person.
 */
export type AdultRole = "parent" | "teacher";

/** The grown-up who authorised a player. Named by role, because that is all a child needs. */
export type Guardian = { id: string; role: AdultRole };

export type Player = {
  id: string;
  /** Generated, never a real name. */
  alias: string;
  /** What you hand to a friend so they can ask to play. */
  code: string;
  guardianId: string;
};

export const CODE_LENGTH = 6;

/**
 * The alphabet has no O/0 or I/1, because these codes get read aloud and written on paper
 * by children. The same choice was made for the printed classroom cards.
 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Cleans up whatever was typed.
 *
 * Children type with spaces, dashes and the wrong case, and a code that only works when
 * entered perfectly is a code that does not work. Anything outside the alphabet is dropped
 * rather than rejected, so "rq 47 km" and "RQ-47-KM" are the same thing.
 */
export function normalizeCode(input: unknown): string {
  if (typeof input !== "string") return "";
  return [...input.toUpperCase()].filter((character) => CODE_ALPHABET.includes(character)).join("");
}

export function isCompleteCode(input: unknown): boolean {
  return normalizeCode(input).length === CODE_LENGTH;
}

/** A code for this device's own player, drawn once and then kept. */
export function createCode(random: () => number = Math.random): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    const draw = random();
    const safeDraw = Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 0.999_999) : 0;
    code += CODE_ALPHABET[Math.floor(safeDraw * CODE_ALPHABET.length)];
  }
  return code;
}

/** Groups a code for reading aloud: RQ47KM becomes RQ4 7KM. */
export function formatCode(code: string): string {
  const normalized = normalizeCode(code);
  return normalized.length === CODE_LENGTH ? `${normalized.slice(0, 3)} ${normalized.slice(3)}` : normalized;
}

export const FRIENDS_VERSION = 1;

export type FriendsDocument = {
  version: number;
  /** This child's own code. Null until one is drawn. */
  code: string | null;
  /** Answered yes, both ways. */
  friendIds: readonly string[];
  /** We used their code and are waiting for them to answer. */
  requestedIds: readonly string[];
  /**
   * Requests we turned down.
   *
   * Kept so a rejected request does not reappear at the next opening, which would make
   * "no" a button that does nothing. It records a decision, not a person: the same child
   * can still be asked later with their code.
   */
  dismissedIds: readonly string[];
};

export const emptyFriendsDocument: FriendsDocument = {
  version: FRIENDS_VERSION,
  code: null,
  friendIds: [],
  requestedIds: [],
  dismissedIds: []
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rebuilds a stored list, dropping anything unreadable rather than guessing at it. */
export function parseFriendsDocument(value: unknown): FriendsDocument {
  if (!isRecord(value) || value.version !== FRIENDS_VERSION) return emptyFriendsDocument;

  const code = typeof value.code === "string" && isCompleteCode(value.code) ? normalizeCode(value.code) : null;
  const ids = (raw: unknown): string[] =>
    Array.isArray(raw)
      ? [...new Set(raw.filter((id): id is string => typeof id === "string" && id.length > 0))]
      : [];

  // Being a friend is the later word: it settles anything the other two lists still claim.
  const friendIds = ids(value.friendIds);
  const without = (raw: unknown) => ids(raw).filter((id) => !friendIds.includes(id));

  return {
    version: FRIENDS_VERSION,
    code,
    friendIds,
    requestedIds: without(value.requestedIds),
    dismissedIds: without(value.dismissedIds)
  };
}

/** Why using a code did or did not work. Each one gets its own thing to say on screen. */
export type AddResult = "requested" | "already" | "waiting" | "self" | "unknown" | "incomplete";

export type AddOutcome = { document: FriendsDocument; result: AddResult; alias?: string };

/**
 * Asks whoever owns a code to play.
 *
 * This sends a request; it does not add anybody. The code is how you reach someone, and
 * their answer is what makes you friends - which is the same rule in both directions, so
 * nobody ends up on a list they never agreed to.
 */
export function requestByCode(
  document: FriendsDocument,
  input: unknown,
  players: readonly Player[]
): AddOutcome {
  const code = normalizeCode(input);
  if (code.length !== CODE_LENGTH) return { document, result: "incomplete" };
  if (document.code && code === document.code) return { document, result: "self" };

  const found = players.find((player) => player.code === code);
  if (!found) return { document, result: "unknown" };
  if (document.friendIds.includes(found.id)) return { document, result: "already", alias: found.alias };
  if (document.requestedIds.includes(found.id)) return { document, result: "waiting", alias: found.alias };

  return {
    document: { ...document, requestedIds: [...document.requestedIds, found.id] },
    result: "requested",
    alias: found.alias
  };
}

/**
 * The requests waiting for this child to answer.
 *
 * Whoever was already accepted or already turned down has been answered, so only the rest
 * are shown - an inbox that keeps offering settled questions stops being read.
 */
export function getPendingRequests(
  document: FriendsDocument,
  incoming: readonly string[],
  players: readonly Player[]
): Player[] {
  return incoming
    .filter((id) => !document.friendIds.includes(id) && !document.dismissedIds.includes(id))
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is Player => player !== undefined);
}

/** Says yes to a request, whichever direction it came from. */
export function acceptRequestFrom(document: FriendsDocument, playerId: string): FriendsDocument {
  if (document.friendIds.includes(playerId)) return document;
  return {
    ...document,
    friendIds: [...document.friendIds, playerId],
    requestedIds: document.requestedIds.filter((id) => id !== playerId),
    dismissedIds: document.dismissedIds.filter((id) => id !== playerId)
  };
}

/** Says no. Remembered, so the same request is not asked again tomorrow. */
export function rejectRequestFrom(document: FriendsDocument, playerId: string): FriendsDocument {
  if (document.friendIds.includes(playerId) || document.dismissedIds.includes(playerId)) return document;
  return { ...document, dismissedIds: [...document.dismissedIds, playerId] };
}

/** Takes back a request that has not been answered. */
export function cancelRequest(document: FriendsDocument, playerId: string): FriendsDocument {
  if (!document.requestedIds.includes(playerId)) return document;
  return { ...document, requestedIds: document.requestedIds.filter((id) => id !== playerId) };
}

/**
 * Removes a friend entirely rather than marking them refused.
 *
 * A child who removes someone and changes their mind only needs the code again; keeping a
 * tombstone would turn a moment's decision into one they cannot see or undo.
 */
export function removeFriend(document: FriendsDocument, playerId: string): FriendsDocument {
  if (!document.friendIds.includes(playerId)) return document;
  return { ...document, friendIds: document.friendIds.filter((id) => id !== playerId) };
}

function resolve(ids: readonly string[], players: readonly Player[]): Player[] {
  return ids
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is Player => player !== undefined);
}

/** The friends themselves, in the order they were added. */
export function getFriends(document: FriendsDocument, players: readonly Player[]): Player[] {
  return resolve(document.friendIds, players);
}

/** Requests we sent that nobody has answered yet. */
export function getSentRequests(document: FriendsDocument, players: readonly Player[]): Player[] {
  return resolve(document.requestedIds, players);
}

export function countFriends(document: FriendsDocument): number {
  return document.friendIds.length;
}
