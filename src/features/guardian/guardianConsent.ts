import { isPlayedOn } from "@/features/progress/streak";

/**
 * The moment a responsible adult says yes.
 *
 * Only adults consent; a child never does. That rule is the project's central privacy
 * promise, so the consent it rests on is recorded as a plain fact: it happened, on this
 * day. Nothing else is asked, because nothing else is needed.
 *
 * There is no form. Nobody types an email, a name or a password, and no such field
 * exists to type into: a single tap is the whole interaction. What is stored could not
 * identify a person even if the file were read by someone else.
 *
 * Today nothing is uploaded, because there is nowhere to upload it to. When the server
 * exists, this record is what gets synced; the flow around it does not change.
 */
export type GuardianConsent = {
  /** The local day the adult authorised, mirroring `adultos.autorizo_en` in the schema. */
  authorizedOn: string;
  /**
   * True while the progress still lives only on this device. It becomes false the day a
   * sync actually happens, so the interface can be honest about what has and has not
   * left the phone instead of implying a backup that does not exist.
   */
  syncPending: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rebuilds stored consent. Anything unreadable means no consent, never an assumed yes. */
export function parseGuardianConsent(value: unknown): GuardianConsent | null {
  if (!isRecord(value) || !isPlayedOn(value.authorizedOn)) return null;
  return { authorizedOn: value.authorizedOn, syncPending: value.syncPending !== false };
}

export function grantGuardianConsent(authorizedOn: string): GuardianConsent | null {
  if (!isPlayedOn(authorizedOn)) return null;
  return { authorizedOn, syncPending: true };
}

export function hasGuardianConsent(consent: GuardianConsent | null | undefined): boolean {
  return consent !== null && consent !== undefined;
}

/**
 * What an adult is agreeing to, listed as keys so both languages spell it out and the
 * list can be read before the decision rather than buried after it.
 */
export const consentPromiseKeys = ["nothingYet", "noRealName", "onlyProgress", "revocable"] as const;

export type ConsentPromiseKey = (typeof consentPromiseKeys)[number];
