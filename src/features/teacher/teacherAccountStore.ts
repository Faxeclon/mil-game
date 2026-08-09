"use client";

import { registerAdult, signOutAdult, useAdultAccount } from "@/features/adults/adultAccountStore";
import { isTeacher, type AdultAccount } from "@/features/adults/adultAccount";

/**
 * The teacher's view of the one adult account.
 *
 * Teachers and families are the same kind of record now, differing only in a role, so this
 * is a lens rather than a second store: it answers "is a teacher holding this device?" and
 * nothing else. The classroom screens keep asking the question they always asked, and none
 * of them had to learn that families exist.
 */
type Snapshot = { hydrated: boolean; account: AdultAccount | null };

export function useTeacherAccount(): Snapshot {
  const { hydrated, account } = useAdultAccount();
  return { hydrated, account: isTeacher(account) ? account : null };
}

/** Kept for the classroom sign-up, which knows its own role without being told. */
export function registerTeacher(email: string, registeredOn: string): boolean {
  return registerAdult(email, "teacher", registeredOn);
}

export function signOutTeacher(): void {
  signOutAdult();
}
