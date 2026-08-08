"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_ACCESSIBILITY,
  parseAccessibility,
  selectRuleset,
  togglePresentation,
  type AccessibilitySettings,
  type PresentationSettings,
  type RulesetKey
} from "./accessibilitySettings";

/**
 * Where the accessibility choices live between visits.
 *
 * Per device rather than per player, like the sound control: the phone that needs the
 * voice is usually the same phone every time, whoever is holding it, and a child should
 * not have to find the setting again after switching profiles.
 */
export const ACCESSIBILITY_STORAGE_KEY = "kikiria.accessibility.v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readAccessibility(): AccessibilitySettings {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_ACCESSIBILITY };
  try {
    const raw = storage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (raw === null) return { ...DEFAULT_ACCESSIBILITY };
    return parseAccessibility(JSON.parse(raw));
  } catch {
    // Unreadable or malformed: the child loses their settings, never the game.
    return { ...DEFAULT_ACCESSIBILITY };
  }
}

function writeAccessibility(settings: AccessibilitySettings): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // A blocked storage only means the choice does not survive a reload.
  }
}

type Snapshot = { hydrated: boolean; settings: AccessibilitySettings };

const serverSnapshot: Snapshot = { hydrated: false, settings: DEFAULT_ACCESSIBILITY };
let snapshot: Snapshot = serverSnapshot;
const listeners = new Set<() => void>();

function publish(next: Snapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!snapshot.hydrated) publish({ hydrated: true, settings: readAccessibility() });
  return () => {
    listeners.delete(listener);
  };
}

function commit(settings: AccessibilitySettings): void {
  writeAccessibility(settings);
  publish({ hydrated: true, settings });
}

export function setAccessibility(settings: AccessibilitySettings): void {
  commit(settings);
}

export function togglePresentationSetting(key: keyof PresentationSettings): void {
  commit(togglePresentation(snapshot.settings, key));
}

export function chooseRuleset(ruleset: RulesetKey): void {
  commit(selectRuleset(snapshot.settings, ruleset));
}

/** Test helper: drops every subscriber and returns the store to its initial snapshot. */
export function resetAccessibilityStoreForTests(): void {
  listeners.clear();
  snapshot = serverSnapshot;
}

export function useAccessibility(): AccessibilitySettings {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.settings,
    () => serverSnapshot.settings
  );
}
