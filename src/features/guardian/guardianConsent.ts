import { isPlayedOn } from "@/features/progress/streak";

/**
 * The moment a responsible adult says yes.
 *
 * Only adults have accounts; a child has a profile that hangs off one. That rule is the
 * project's central privacy promise, so the consent it rests on is recorded as a fact
 * with a role and a date - the same shape the cloud will store later.
 *
 * Today nothing is uploaded, because there is nowhere to upload it to. What is built
 * here is the decision itself: who authorised, in what capacity, and when. When the
 * server exists, this record is what gets synced; the flow around it does not change.
 *
 * It is a single tap, deliberately. Nobody types an email, a name or a password: the
 * record holds a role and a date and nothing that could identify a person, so there is
 * no form to fill and nothing to protect.
 */
export type GuardianRole = "parent" | "teacher";

export const guardianRoles = ["parent", "teacher"] as const;

export type GuardianConsent = {
  role: GuardianRole;
  /** The local day the adult authorised, mirroring `adultos.autorizo_en` in the schema. */
  authorizedOn: string;
  /**
   * True while the progress still lives only on this device. It becomes false the day a
   * sync actually happens, so the interface can be honest about what has and has not
   * left the phone instead of implying a backup that does not exist.
   */
  syncPending: boolean;
};

export function isGuardianRole(value: unknown): value is GuardianRole {
  return typeof value === "string" && (guardianRoles as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rebuilds stored consent. Anything unreadable means no consent, never a assumed yes. */
export function parseGuardianConsent(value: unknown): GuardianConsent | null {
  if (!isRecord(value)) return null;
  if (!isGuardianRole(value.role) || !isPlayedOn(value.authorizedOn)) return null;
  return {
    role: value.role,
    authorizedOn: value.authorizedOn,
    syncPending: value.syncPending !== false
  };
}

export function grantGuardianConsent(role: GuardianRole, authorizedOn: string): GuardianConsent | null {
  if (!isGuardianRole(role) || !isPlayedOn(authorizedOn)) return null;
  return { role, authorizedOn, syncPending: true };
}

export function hasGuardianConsent(consent: GuardianConsent | null | undefined): boolean {
  return consent !== null && consent !== undefined;
}

/**
 * What an adult is agreeing to, listed as keys so both languages spell it out and the
 * list can be shown before the decision rather than buried after it.
 */
export const consentPromiseKeys = ["nothingYet", "noRealName", "onlyProgress", "revocable"] as const;

export type ConsentPromiseKey = (typeof consentPromiseKeys)[number];
