"use client";

import { useSyncExternalStore } from "react";
import { localFriendsPort, type FriendsPort } from "./friendsPort";
import {
  acceptRequestFrom,
  cancelRequest,
  createCode,
  emptyFriendsDocument,
  rejectRequestFrom,
  removeFriend,
  requestByCode,
  type AddResult,
  type FriendsDocument,
  type Player
} from "./friendsModel";

/**
 * The friends list, shared by every screen that shows it.
 *
 * It reads through a port rather than from storage directly, so the day a server exists
 * only `port` below changes. Loading is asynchronous because a real one would be, and the
 * screen already shows its waiting state - which means that day costs nothing here.
 */
type Snapshot = {
  hydrated: boolean;
  document: FriendsDocument;
  players: readonly Player[];
  /** Ids of players who used this child's code and are waiting for an answer. */
  incoming: readonly string[];
};

const serverSnapshot: Snapshot = {
  hydrated: false,
  document: emptyFriendsDocument,
  players: [],
  incoming: []
};

let snapshot: Snapshot = serverSnapshot;
let port: FriendsPort = localFriendsPort;
let loading = false;

const listeners = new Set<() => void>();

function publish(next: Snapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function commit(document: FriendsDocument): void {
  publish({ ...snapshot, document });
  void port.save(document);
}

async function load(): Promise<void> {
  if (loading || snapshot.hydrated) return;
  loading = true;
  try {
    const [players, incoming, stored] = await Promise.all([
      port.lookupPlayers(),
      port.listIncoming(),
      port.load()
    ]);
    // The code is drawn the first time it is needed and then never changes: a child who
    // gave theirs out yesterday must still be reachable by it today.
    const document = stored.code ? stored : { ...stored, code: createCode() };
    publish({ hydrated: true, players, incoming, document });
    if (!stored.code) void port.save(document);
  } catch {
    // A list that will not load leaves an empty one, never a crash.
    publish({ hydrated: true, players: [], incoming: [], document: emptyFriendsDocument });
  } finally {
    loading = false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void load();
  return () => {
    listeners.delete(listener);
  };
}

function change(next: FriendsDocument): void {
  if (next !== snapshot.document) commit(next);
}

/** Asks whoever owns the typed code, and says what happened so the screen can explain. */
export function askByCode(input: string): { result: AddResult; alias?: string } {
  const outcome = requestByCode(snapshot.document, input, snapshot.players);
  change(outcome.document);
  return { result: outcome.result, alias: outcome.alias };
}

export function acceptFrom(playerId: string): void {
  change(acceptRequestFrom(snapshot.document, playerId));
}

export function rejectFrom(playerId: string): void {
  change(rejectRequestFrom(snapshot.document, playerId));
}

export function cancelSentRequest(playerId: string): void {
  change(cancelRequest(snapshot.document, playerId));
}

export function removeByPlayerId(playerId: string): void {
  change(removeFriend(snapshot.document, playerId));
}

/** Swaps the implementation. The seam exists for a server; tests use it too. */
export function setFriendsPort(next: FriendsPort): void {
  port = next;
  snapshot = serverSnapshot;
  loading = false;
}

/** Test helper: drops every subscriber and returns the store to its initial snapshot. */
export function resetFriendsStoreForTests(): void {
  listeners.clear();
  port = localFriendsPort;
  snapshot = serverSnapshot;
  loading = false;
}

export function useFriends(): Snapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot
  );
}
