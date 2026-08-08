import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAdult, resetAdultAccountStoreForTests } from "./adultAccountStore";
import { signOutAdultSession } from "./signOutAdultSession";
import {
  completeLevelInStore,
  getProgressSnapshot,
  markOnboardedInStore,
  resetProgressStoreForTests,
  startAdultPlayInStore,
  subscribeToProgress
} from "@/features/progress/progressStore";
import { readAdultsDocument, getActiveAdult } from "./adultAccount";

const attempt = {
  attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
  correctRounds: 1,
  totalRounds: 1,
  elapsedMs: 30_000,
  completedAt: "2026-08-08T10:00:00.000Z"
};

function stubStorage() {
  const entries = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => void entries.set(key, value),
      removeItem: (key: string) => void entries.delete(key)
    }
  });
  return entries;
}

beforeEach(() => {
  resetProgressStoreForTests();
  resetAdultAccountStoreForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetProgressStoreForTests();
  resetAdultAccountStoreForTests();
});

/** Signs a grown-up in the way the screens do: through the store, not through storage. */
function signIn(email: string, role: "family" | "teacher") {
  registerAdult(email, role, "2026-08-01");
}

describe("leaving, whoever is holding the phone", () => {
  it("lets the grown-up out and puts nobody in their place", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    signIn("rosa@example.com", "teacher");
    startAdultPlayInStore("rosa@example.com", "rosa");

    signOutAdultSession();

    expect(getActiveAdult(readAdultsDocument())).toBeNull();
    // Their own game steps aside with them rather than being left active and ownerless.
    expect(getProgressSnapshot().profiles.activeId).toBeNull();
    unsubscribe();
  });

  /*
   * The case that was wrong: signing in from a guest game and then signing out. Whether a
   * child's profile was open first cannot decide whether a grown-up may leave.
   */
  it("leaves the child playing exactly where they were", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    markOnboardedInStore("Lu", "fox");
    completeLevelInStore("basics-1", attempt);
    signIn("rosa@example.com", "teacher");

    signOutAdultSession();

    expect(getActiveAdult(readAdultsDocument())).toBeNull();
    expect(getProgressSnapshot().state.localNickname).toBe("Lu");
    expect(getProgressSnapshot().state.completedLevelIds).toEqual(["basics-1"]);
    unsubscribe();
  });

  it("keeps the account, so signing back in needs only the address", () => {
    stubStorage();
    const unsubscribe = subscribeToProgress(() => {});
    signIn("rosa@example.com", "teacher");

    signOutAdultSession();

    expect(readAdultsDocument().accounts).toHaveLength(1);
    unsubscribe();
  });
});
