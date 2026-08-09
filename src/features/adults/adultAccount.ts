import { normalizeLocalNickname } from "@/features/profile/localNickname";

/**
 * The grown-ups this device knows, and which one is signed in.
 *
 * It is the only place in the project that ever asks for an email, and it asks an adult
 * for their own. Children are never asked for anything: on a phone they are a nickname,
 * and in a classroom they are the number printed on a card.
 *
 * One kind of account with a role, rather than two separate ones, because that is what
 * they are: the same person saying who they are, differing only in what they came to do.
 * The cloud schema says the same with `adultos.rol`, so both shapes already agree.
 *
 * Signing out keeps the account and forgets only that it was active - the same rule the
 * children's profiles follow. Destroying it would make signing in impossible without a
 * server, and would force somebody to declare their role again every single time.
 */
export const adultRoles = ["family", "teacher"] as const;

export type AdultRole = (typeof adultRoles)[number];

export type AdultAccount = {
  email: string;
  /** Family looks after their own children; a teacher runs a classroom with cards. */
  role: AdultRole;
  registeredOn: string;
  /** True while the registration has not reached any server, which today is always. */
  syncPending: boolean;
};

export type AdultsDocument = {
  version: 1;
  /** The grown-up currently signed in, or null when nobody is. */
  activeEmail: string | null;
  accounts: AdultAccount[];
};

export const ADULTS_VERSION = 1;

export const emptyAdultsDocument: AdultsDocument = {
  version: ADULTS_VERSION,
  activeEmail: null,
  accounts: []
};

/** A ceiling so a loop or a corrupt file cannot fill the device, never a product rule. */
const MAX_STORED_ADULTS = 20;

export function isAdultRole(value: unknown): value is AdultRole {
  return typeof value === "string" && adultRoles.includes(value as AdultRole);
}

/**
 * The address is taken as typed and never checked.
 *
 * Confirming an email means sending one, and there is no server to send it from. Making
 * the field look strict would only imply a verification that never happened, so the only
 * rule is that something was written: blank, or long enough to be an attack, is refused.
 */
const MAX_EMAIL_LENGTH = 254;

export function normalizeAdultEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) return null;
  return trimmed;
}

export function createAdultAccount(email: unknown, role: unknown, registeredOn: string): AdultAccount | null {
  const normalized = normalizeAdultEmail(email);
  if (!normalized || !isAdultRole(role)) return null;
  if (typeof registeredOn !== "string" || registeredOn.length === 0) return null;
  return { email: normalized, role, registeredOn, syncPending: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAdultAccount(value: unknown): AdultAccount | null {
  if (!isRecord(value)) return null;
  const email = normalizeAdultEmail(value.email);
  if (!email || typeof value.registeredOn !== "string" || value.registeredOn.length === 0) return null;
  // A record written before roles existed can only have come from the teacher screen.
  const role = isAdultRole(value.role) ? value.role : "teacher";
  return { email, role, registeredOn: value.registeredOn, syncPending: value.syncPending !== false };
}

export function getActiveAdult(document: AdultsDocument): AdultAccount | null {
  return document.accounts.find((account) => account.email === document.activeEmail) ?? null;
}

/** Whether this device already knows the address, which is what makes signing in possible. */
export function findAdultByEmail(document: AdultsDocument, email: unknown): AdultAccount | null {
  const normalized = normalizeAdultEmail(email);
  if (!normalized) return null;
  return document.accounts.find((account) => account.email === normalized) ?? null;
}

export type SignInResult = { document: AdultsDocument; found: AdultAccount | null };

/**
 * Signs in with nothing but an address.
 *
 * The role is not asked for because the device already knows it. An address it has never
 * seen is answered honestly - there is nobody to sign in as - rather than by silently
 * creating an account and picking a role on their behalf.
 */
export function signInAdult(document: AdultsDocument, email: unknown): SignInResult {
  const found = findAdultByEmail(document, email);
  if (!found) return { document, found: null };
  return { document: { ...document, activeEmail: found.email }, found };
}

/** Registers a grown-up and signs them in. Registering again updates the role. */
export function registerAdultAccount(
  document: AdultsDocument,
  email: unknown,
  role: unknown,
  registeredOn: string
): SignInResult {
  const account = createAdultAccount(email, role, registeredOn);
  if (!account) return { document, found: null };

  const others = document.accounts.filter((entry) => entry.email !== account.email);
  if (others.length >= MAX_STORED_ADULTS) return { document, found: null };

  return {
    document: { ...document, activeEmail: account.email, accounts: [...others, account] },
    found: account
  };
}

/** Steps away without forgetting the account, so signing back in needs only the address. */
export function signOutActiveAdult(document: AdultsDocument): AdultsDocument {
  return document.activeEmail === null ? document : { ...document, activeEmail: null };
}

/** Forgets a grown-up for good. Only ever asked for on purpose. */
export function forgetAdult(document: AdultsDocument, email: string): AdultsDocument {
  const accounts = document.accounts.filter((account) => account.email !== email);
  if (accounts.length === document.accounts.length) return document;
  return {
    ...document,
    activeEmail: document.activeEmail === email ? null : document.activeEmail,
    accounts
  };
}

export function isTeacher(account: AdultAccount | null): boolean {
  return account?.role === "teacher";
}

export function isFamily(account: AdultAccount | null): boolean {
  return account?.role === "family";
}

/**
 * Where this grown-up's own tools live, which is the only thing the role decides.
 *
 * Signing in adds a door; it never takes one away. Every shared screen - the bar, the
 * header, the settings, the home - asks this rather than asking "is a teacher here?", so
 * a parent is as visible to the app as a teacher is and neither of them loses the game.
 */
export function getAdultHome(account: AdultAccount | null): "/teacher" | "/adult" | null {
  if (!account) return null;
  return account.role === "teacher" ? "/teacher" : "/adult";
}

/**
 * The name a grown-up plays under, taken from the address they already gave.
 *
 * Signing in is picking a profile: they said who they are, so the game has no business
 * asking again with a nickname form. The part before the @ is what people write when they
 * are naming themselves, which makes it the closest thing to a chosen name we hold.
 */
export function getAdultPlayName(account: AdultAccount | null): string | null {
  if (!account) return null;
  const [localPart] = account.email.split("@");
  return normalizeLocalNickname(localPart) ?? normalizeLocalNickname(account.email) ?? null;
}

export const ADULTS_STORAGE_KEY = "kikiria.adults.v1";

/** Where the teacher-only account used to live, read once so nobody registers again. */
export const LEGACY_TEACHER_STORAGE_KEY = "kikiria.teacher.account.v1";

/** The single-account key this file used before it could hold more than one. */
export const LEGACY_ADULT_STORAGE_KEY = "kikiria.adult.v1";

/** Rebuilds the stored grown-ups, dropping anything unreadable rather than guessing. */
export function parseAdultsDocument(value: unknown): AdultsDocument {
  if (!isRecord(value) || value.version !== ADULTS_VERSION || !Array.isArray(value.accounts)) {
    return emptyAdultsDocument;
  }

  const accounts: AdultAccount[] = [];
  const seen = new Set<string>();
  for (const entry of value.accounts) {
    const account = parseAdultAccount(entry);
    if (!account || seen.has(account.email) || accounts.length >= MAX_STORED_ADULTS) continue;
    seen.add(account.email);
    accounts.push(account);
  }

  // Nobody signed in is a real state, so an explicit null is honoured.
  const activeEmail =
    typeof value.activeEmail === "string" && seen.has(value.activeEmail) ? value.activeEmail : null;

  return { version: ADULTS_VERSION, activeEmail, accounts };
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Reads the grown-ups, adopting either older record so nobody has to register again: the
 * single-account file, and before that the teacher-only one.
 */
export function readAdultsDocument(): AdultsDocument {
  const storage = getStorage();
  if (!storage) return emptyAdultsDocument;

  try {
    const raw = storage.getItem(ADULTS_STORAGE_KEY);
    if (raw) return parseAdultsDocument(JSON.parse(raw));

    for (const legacyKey of [LEGACY_ADULT_STORAGE_KEY, LEGACY_TEACHER_STORAGE_KEY]) {
      const legacy = storage.getItem(legacyKey);
      if (!legacy) continue;
      const account = parseAdultAccount(JSON.parse(legacy));
      if (!account) continue;
      const migrated: AdultsDocument = {
        version: ADULTS_VERSION,
        activeEmail: account.email,
        accounts: [account]
      };
      writeAdultsDocument(migrated);
      return migrated;
    }
    return emptyAdultsDocument;
  } catch {
    return emptyAdultsDocument;
  }
}

export function writeAdultsDocument(document: AdultsDocument): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(ADULTS_STORAGE_KEY, JSON.stringify(document));
    // The old keys go, or the next read could resurrect a stale account.
    storage.removeItem(LEGACY_ADULT_STORAGE_KEY);
    storage.removeItem(LEGACY_TEACHER_STORAGE_KEY);
  } catch {
    // A blocked storage must not stop a teacher using the session guide.
  }
}
