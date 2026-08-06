"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the game may make noise.
 *
 * The preference is kept per device rather than per player: a phone used in a classroom
 * or a shared room is silenced for everyone in it, which is what a teacher or a parent
 * actually wants when they reach for the control.
 *
 * It starts off. Background music never starts until someone on this device asks for it.
 */
export const SOUND_STORAGE_KEY = "kikiria.sound.v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSoundEnabled(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    return storage.getItem(SOUND_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function writeSoundEnabled(enabled: boolean): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // A blocked storage only means the choice does not survive a reload.
  }
}

let snapshot: { hydrated: boolean; enabled: boolean } = { hydrated: false, enabled: false };
const listeners = new Set<() => void>();

function publish(next: typeof snapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!snapshot.hydrated) publish({ hydrated: true, enabled: readSoundEnabled() });
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot = { hydrated: false, enabled: false };

export function setSoundEnabled(enabled: boolean): void {
  writeSoundEnabled(enabled);
  publish({ hydrated: true, enabled });
}

export function toggleSound(): void {
  setSoundEnabled(!snapshot.enabled);
}

/** Test helper: drops every subscriber and returns the store to its initial snapshot. */
export function resetSoundStoreForTests(): void {
  listeners.clear();
  snapshot = serverSnapshot;
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.enabled,
    () => serverSnapshot.enabled
  );
}
