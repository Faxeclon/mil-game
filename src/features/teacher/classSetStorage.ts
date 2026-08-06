import { parseClassSet, type TeacherClassSet } from "./classCards";

/**
 * The teacher's card set, kept on the teacher's own device.
 *
 * It is stored separately from the children's progress on purpose: this belongs to the
 * adult who printed it, and nothing about a class ever mixes into a player's medals.
 */
export const CLASS_SET_STORAGE_KEY = "kikiria.teacher.v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readClassSet(): TeacherClassSet | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(CLASS_SET_STORAGE_KEY);
    return raw ? parseClassSet(JSON.parse(raw)) : null;
  } catch {
    // Unreadable data means no set, never a half-built one.
    return null;
  }
}

export function writeClassSet(set: TeacherClassSet): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(CLASS_SET_STORAGE_KEY, JSON.stringify(set));
  } catch {
    // A full or blocked storage must not stop the teacher printing what is on screen.
  }
}

export function clearClassSet(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(CLASS_SET_STORAGE_KEY);
  } catch {
    // Nothing else to do; the caller drops it from memory anyway.
  }
}
