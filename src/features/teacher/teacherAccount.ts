/**
 * The teacher's own account on their own device.
 *
 * This is the one email the project ever asks for, and it belongs to an adult who typed
 * it about themselves. No child is asked for anything: the children in a classroom hold
 * printed cards and never touch this device.
 *
 * Nothing is sent anywhere yet - there is no server to send it to - so what is stored is
 * a registration waiting to become an account. The interface says exactly that rather
 * than implying the address was verified or that a class was created somewhere.
 */
export type TeacherAccount = {
  email: string;
  registeredOn: string;
  /** True while the registration has not reached any server, which today is always. */
  syncPending: boolean;
};

/**
 * The address is taken as typed and never checked.
 *
 * Confirming an email means sending one, and there is no server to send it from. Making
 * the field look strict would only imply a verification that never happened, so the only
 * rule is that something was written: blank, or long enough to be an attack, is refused.
 */
const MAX_EMAIL_LENGTH = 254;

export function normalizeTeacherEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) return null;
  return trimmed;
}

export function createTeacherAccount(email: unknown, registeredOn: string): TeacherAccount | null {
  const normalized = normalizeTeacherEmail(email);
  if (!normalized || typeof registeredOn !== "string" || registeredOn.length === 0) return null;
  return { email: normalized, registeredOn, syncPending: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rebuilds a stored registration; anything unreadable means no teacher on this device. */
export function parseTeacherAccount(value: unknown): TeacherAccount | null {
  if (!isRecord(value)) return null;
  const email = normalizeTeacherEmail(value.email);
  if (!email || typeof value.registeredOn !== "string" || value.registeredOn.length === 0) return null;
  return { email, registeredOn: value.registeredOn, syncPending: value.syncPending !== false };
}

export function isTeacherRegistered(account: TeacherAccount | null): boolean {
  return account !== null;
}

/** Kept apart from every child's progress: this belongs to the adult, not to a player. */
export const TEACHER_ACCOUNT_STORAGE_KEY = "kikiria.teacher.account.v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTeacherAccount(): TeacherAccount | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(TEACHER_ACCOUNT_STORAGE_KEY);
    return raw ? parseTeacherAccount(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeTeacherAccount(account: TeacherAccount): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(TEACHER_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch {
    // A blocked storage must not stop a teacher using the session guide.
  }
}

export function clearTeacherAccount(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(TEACHER_ACCOUNT_STORAGE_KEY);
  } catch {
    // Nothing else to do; the caller drops it from memory anyway.
  }
}
