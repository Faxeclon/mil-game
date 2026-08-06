import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import {
  clearTeacherAccount,
  createTeacherAccount,
  isTeacherRegistered,
  normalizeTeacherEmail,
  parseTeacherAccount,
  readTeacherAccount,
  TEACHER_ACCOUNT_STORAGE_KEY,
  writeTeacherAccount
} from "./teacherAccount";

function stubStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key)
    }
  });
  return map;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the one email the project asks for", () => {
  it("accepts an ordinary address and tidies it up", () => {
    expect(normalizeTeacherEmail("  Rosa.Perez@Colegio.EDU.pe ")).toBe("rosa.perez@colegio.edu.pe");
  });

  it("takes whatever was typed, because there is no server to confirm it against", () => {
    // Looking strict would imply a verification that never happens. Only blank is refused.
    expect(normalizeTeacherEmail("rosa")).toBe("rosa");
    expect(normalizeTeacherEmail("prueba@prueba")).toBe("prueba@prueba");
    expect(normalizeTeacherEmail("   ")).toBeNull();
    expect(normalizeTeacherEmail("")).toBeNull();
    expect(normalizeTeacherEmail(42)).toBeNull();
  });

  it("refuses an address long enough to be an attack rather than a typo", () => {
    expect(normalizeTeacherEmail("a".repeat(300))).toBeNull();
  });
});

describe("registering a teacher", () => {
  it("records the address and the day, and nothing has been sent", () => {
    expect(createTeacherAccount("rosa@colegio.pe", "2026-08-05")).toEqual({
      email: "rosa@colegio.pe",
      registeredOn: "2026-08-05",
      syncPending: true
    });
  });

  it("refuses only a blank address and a day it cannot record", () => {
    expect(createTeacherAccount("   ", "2026-08-05")).toBeNull();
    expect(createTeacherAccount("rosa@colegio.pe", "")).toBeNull();
  });

  it("knows when nobody has registered on this device", () => {
    expect(isTeacherRegistered(null)).toBe(false);
    expect(isTeacherRegistered(createTeacherAccount("rosa@colegio.pe", "2026-08-05"))).toBe(true);
  });
});

describe("reading a stored registration", () => {
  it("keeps a valid one", () => {
    const account = { email: "rosa@colegio.pe", registeredOn: "2026-08-05", syncPending: true };

    expect(parseTeacherAccount(account)).toEqual(account);
  });

  it("treats anything unreadable as nobody registered", () => {
    expect(parseTeacherAccount(undefined)).toBeNull();
    expect(parseTeacherAccount("rosa@colegio.pe")).toBeNull();
    expect(parseTeacherAccount({ email: "  ", registeredOn: "2026-08-05" })).toBeNull();
    expect(parseTeacherAccount({ email: "rosa@colegio.pe" })).toBeNull();
  });
});

describe("keeping it on the teacher's own device", () => {
  it("writes and reads back the registration", () => {
    const entries = stubStorage();
    const account = createTeacherAccount("rosa@colegio.pe", "2026-08-05");
    writeTeacherAccount(account!);

    expect(entries.has(TEACHER_ACCOUNT_STORAGE_KEY)).toBe(true);
    expect(readTeacherAccount()).toEqual(account);
  });

  it("keeps it away from every child's progress key", () => {
    expect(TEACHER_ACCOUNT_STORAGE_KEY).not.toContain("progress");
    expect(TEACHER_ACCOUNT_STORAGE_KEY).not.toContain("profiles");
  });

  it("forgets it on sign-out", () => {
    const entries = stubStorage();
    writeTeacherAccount(createTeacherAccount("rosa@colegio.pe", "2026-08-05")!);
    clearTeacherAccount();

    expect(entries.has(TEACHER_ACCOUNT_STORAGE_KEY)).toBe(false);
    expect(readTeacherAccount()).toBeNull();
  });

  it("keeps working when storage is unavailable", () => {
    expect(readTeacherAccount()).toBeNull();
    expect(() => writeTeacherAccount(createTeacherAccount("rosa@colegio.pe", "2026-08-05")!)).not.toThrow();
    expect(() => clearTeacherAccount()).not.toThrow();
  });
});

describe("what the teacher is told", () => {
  it("says in both languages that the address is only for them", () => {
    for (const { locale, messages } of [
      { locale: "en", messages: englishMessages },
      { locale: "es", messages: spanishMessages }
    ] as const) {
      const t = createTranslator({ locale, messages, namespace: "teacherAccount" });

      for (const key of ["title", "lead", "emailLabel", "emailHint", "submit", "notSent", "signOut"] as const) {
        expect(t(key), `${locale}.${key}`).toEqual(expect.any(String));
        expect(t(key).trim().length).toBeGreaterThan(0);
      }
      expect(t("emailHint").toLowerCase()).toMatch(/niñ|child/);
    }
  });
});
