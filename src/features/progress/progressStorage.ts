import { initialProgressState, parseProgressState, type ProgressState } from "./progressState";

/** Versioned key so a future schema change can migrate instead of corrupting. */
export const PROGRESS_STORAGE_KEY = "kikiria.progress.v1";

/**
 * Returns localStorage only when it is actually usable. It is missing during server
 * rendering and can throw in private modes or when storage is disabled, so every access
 * goes through here and no page touches the key directly.
 */
function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readProgressState(): ProgressState {
  const storage = getStorage();
  if (!storage) return initialProgressState;

  try {
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return initialProgressState;
    return parseProgressState(JSON.parse(raw));
  } catch {
    // Corrupt or unreadable data must never break the game; start clean instead.
    return initialProgressState;
  }
}

export function writeProgressState(state: ProgressState): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A full or blocked storage should not interrupt play.
  }
}

export function clearProgressState(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(PROGRESS_STORAGE_KEY);
  } catch {
    // Nothing else to do; the in-memory state is reset by the caller.
  }
}
