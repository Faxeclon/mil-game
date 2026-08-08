import { seededIncoming, seededPlayers } from "./friendsDirectory";
import {
  emptyFriendsDocument,
  parseFriendsDocument,
  type FriendsDocument,
  type Player
} from "./friendsModel";

/**
 * The seam.
 *
 * The rules and screens talk to a `FriendsPort` and never to storage. Today the sole
 * implementation is a local demo: it keeps sample rows on this device and never sends a
 * request anywhere. Any networked feature would require a new specification and review.
 *
 * The methods return promises even though the local one has nothing to wait for, so a
 * caller written today still works when the answer starts taking a moment.
 */
export type FriendsPort = {
  /** Resolves a code to a player. Never used to list anybody. */
  lookupPlayers: () => Promise<readonly Player[]>;
  /** Who used this child's code and is waiting for an answer. */
  listIncoming: () => Promise<readonly string[]>;
  load: () => Promise<FriendsDocument>;
  save: (document: FriendsDocument) => Promise<void>;
};

export const FRIENDS_STORAGE_KEY = "kikiria.friends.v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readFriendsDocument(): FriendsDocument {
  const storage = getStorage();
  if (!storage) return emptyFriendsDocument;
  try {
    const raw = storage.getItem(FRIENDS_STORAGE_KEY);
    return raw ? parseFriendsDocument(JSON.parse(raw)) : emptyFriendsDocument;
  } catch {
    // Unreadable data means an empty list, never a half-built one.
    return emptyFriendsDocument;
  }
}

export function writeFriendsDocument(document: FriendsDocument): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(document));
  } catch {
    // A blocked storage must not stop a child playing; the list simply forgets.
  }
}

export const localFriendsPort: FriendsPort = {
  lookupPlayers: async () => seededPlayers,
  listIncoming: async () => seededIncoming,
  load: async () => readFriendsDocument(),
  save: async (document) => writeFriendsDocument(document)
};
