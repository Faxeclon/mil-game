import { isPlayedOn } from "@/features/progress/streak";

/**
 * The responsible adult a child is linked to.
 *
 * Only adults consent; a child never does. That rule is the project's central privacy
 * promise, so what is recorded is the adult's own address and the day they said yes -
 * the same pair the cloud schema keeps in `adultos`.
 *
 * Nothing about the child is asked for here, and nothing about the child is added: the
 * link is recorded beside their progress and changes none of it. Unlinking later leaves
 * every medal exactly where it was.
 *
 * Teachers register through their own door on the start screen. This one is for the
 * grown-up at home, so it asks who they are and nothing about which kind.
 */
export type GuardianConsent = {
  /** The adult's own address, taken as typed. Nothing is sent to it. */
  email: string;
  /** The local day the adult linked, mirroring `adultos.autorizo_en` in the schema. */
  authorizedOn: string;
  /**
   * True while the progress still lives only on this device. It becomes false the day a
   * sync actually happens, so the interface can be honest about what has and has not
   * left the phone instead of implying a backup that does not exist.
   */
  syncPending: boolean;
};

const MAX_EMAIL_LENGTH = 254;

/**
 * Taken as typed and never checked. Confirming an address means sending mail to it, and
 * there is nowhere to send it from, so a strict-looking field would only imply a
 * verification that never happened.
 */
export function normalizeGuardianEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) return null;
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rebuilds stored consent. Anything unreadable means no link, never an assumed yes. */
export function parseGuardianConsent(value: unknown): GuardianConsent | null {
  if (!isRecord(value)) return null;
  const email = normalizeGuardianEmail(value.email);
  if (!email || !isPlayedOn(value.authorizedOn)) return null;
  return { email, authorizedOn: value.authorizedOn, syncPending: value.syncPending !== false };
}

export function grantGuardianConsent(email: unknown, authorizedOn: string): GuardianConsent | null {
  const normalized = normalizeGuardianEmail(email);
  if (!normalized || !isPlayedOn(authorizedOn)) return null;
  return { email: normalized, authorizedOn, syncPending: true };
}

export function hasGuardianConsent(consent: GuardianConsent | null | undefined): boolean {
  return consent !== null && consent !== undefined;
}

/**
 * What the adult is agreeing to, listed as keys so both languages spell it out and the
 * list can be read before the decision rather than buried after it.
 */
export const consentPromiseKeys = ["nothingYet", "noRealName", "onlyProgress", "revocable"] as const;

export type ConsentPromiseKey = (typeof consentPromiseKeys)[number];
