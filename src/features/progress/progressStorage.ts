import {
  emptyProfilesDocument,
  parseProfilesDocument,
  type ProfilesDocument
} from "@/features/profiles/localProfiles";
import { initialProgressState, type ProgressState } from "./progressState";

/** Versioned key so a future schema change can migrate instead of corrupting. */
export const PROGRESS_STORAGE_KEY = "kikiria.progress.v1";

/**
 * Where several children on one phone are kept. The single-player key above is read once
 * and folded in, so a device that already played keeps every medal it earned.
 */
export const PROFILES_STORAGE_KEY = "kikiria.profiles.v1";

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

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    // Corrupt or unreadable data must never break the game.
    return undefined;
  }
}

export function readProfilesDocument(): ProfilesDocument {
  const storage = getStorage();
  if (!storage) return emptyProfilesDocument;

  const document = parseProfilesDocument(
    readJson(storage, PROFILES_STORAGE_KEY),
    readJson(storage, PROGRESS_STORAGE_KEY)
  );

  // Once the single-player save has been folded in, it is removed: leaving it behind
  // would resurrect old medals the next time the profiles document is cleared.
  if (document.profiles.length > 0) {
    try {
      storage.removeItem(PROGRESS_STORAGE_KEY);
    } catch {
      // Not being able to tidy up is harmless; the document above is already correct.
    }
  }
  return document;
}

export function writeProfilesDocument(document: ProfilesDocument): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(document));
  } catch {
    // A full or blocked storage should not interrupt play.
  }
}

export function clearProfilesDocument(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(PROFILES_STORAGE_KEY);
    storage.removeItem(PROGRESS_STORAGE_KEY);
  } catch {
    // Nothing else to do; the in-memory state is reset by the caller.
  }
}

/** The progress of whoever is holding the phone. */
export function readProgressState(): ProgressState {
  const document = readProfilesDocument();
  return document.profiles.find((profile) => profile.id === document.activeId)?.progress ?? initialProgressState;
}
