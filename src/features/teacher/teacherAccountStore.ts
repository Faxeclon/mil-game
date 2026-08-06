"use client";

import { useSyncExternalStore } from "react";
import {
  clearTeacherAccount,
  createTeacherAccount,
  readTeacherAccount,
  writeTeacherAccount,
  type TeacherAccount
} from "./teacherAccount";

/**
 * Whether this device belongs to a teacher, shared across the app.
 *
 * The navigation, the teacher screens and the card generator all read the same answer,
 * so registering in one place reveals the teacher menu everywhere at once without any
 * screen reaching into storage on its own.
 */
type Snapshot = { hydrated: boolean; account: TeacherAccount | null };

const serverSnapshot: Snapshot = { hydrated: false, account: null };
let snapshot: Snapshot = serverSnapshot;
const listeners = new Set<() => void>();

function publish(next: Snapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!snapshot.hydrated) publish({ hydrated: true, account: readTeacherAccount() });
  return () => {
    listeners.delete(listener);
  };
}

export function registerTeacher(email: string, registeredOn: string): boolean {
  const account = createTeacherAccount(email, registeredOn);
  if (!account) return false;
  writeTeacherAccount(account);
  publish({ hydrated: true, account });
  return true;
}

export function signOutTeacher(): void {
  clearTeacherAccount();
  publish({ hydrated: true, account: null });
}

/** Test helper: drops every subscriber and returns the store to its initial snapshot. */
export function resetTeacherAccountStoreForTests(): void {
  listeners.clear();
  snapshot = serverSnapshot;
}

export function useTeacherAccount(): Snapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => serverSnapshot
  );
}
