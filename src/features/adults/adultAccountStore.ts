"use client";

import { useSyncExternalStore } from "react";
import {
  emptyAdultsDocument,
  getActiveAdult,
  readAdultsDocument,
  registerAdultAccount,
  signInAdult,
  signOutActiveAdult,
  writeAdultsDocument,
  type AdultAccount,
  type AdultRole,
  type AdultsDocument
} from "./adultAccount";

/**
 * Which grown-up this device belongs to, shared by every screen that asks.
 *
 * The navigation, the settings and the classroom tools all read the same answer, so
 * signing in one place changes the whole app at once and nothing has to reach into
 * storage on its own.
 */
type Snapshot = { hydrated: boolean; account: AdultAccount | null; adults: AdultsDocument };

const serverSnapshot: Snapshot = { hydrated: false, account: null, adults: emptyAdultsDocument };
let snapshot: Snapshot = serverSnapshot;
const listeners = new Set<() => void>();

function fromDocument(adults: AdultsDocument): Snapshot {
  return { hydrated: true, account: getActiveAdult(adults), adults };
}

function publish(next: Snapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function commit(adults: AdultsDocument): void {
  if (adults === snapshot.adults) return;
  writeAdultsDocument(adults);
  publish(fromDocument(adults));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!snapshot.hydrated) publish(fromDocument(readAdultsDocument()));
  return () => {
    listeners.delete(listener);
  };
}

/** Signs in with nothing but an address. False when this device has never seen it. */
export function signIn(email: string): boolean {
  const { document, found } = signInAdult(snapshot.adults, email);
  if (!found) return false;
  commit(document);
  return true;
}

/** Registers a grown-up with their role and signs them in. */
export function registerAdult(email: string, role: AdultRole, registeredOn: string): boolean {
  const { document, found } = registerAdultAccount(snapshot.adults, email, role, registeredOn);
  if (!found) return false;
  commit(document);
  return true;
}

/** Steps away, keeping the account so signing back in needs only the address. */
export function signOutAdult(): void {
  commit(signOutActiveAdult(snapshot.adults));
}

/** Whether this device already knows anybody, which decides what the door offers first. */
export function hasKnownAdults(): boolean {
  return snapshot.adults.accounts.length > 0;
}

/** Test helper: drops every subscriber and returns the store to its initial snapshot. */
export function resetAdultAccountStoreForTests(): void {
  listeners.clear();
  snapshot = serverSnapshot;
}

export function useAdultAccount(): Snapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot
  );
}
