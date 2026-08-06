import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import {
  consentPromiseKeys,
  grantGuardianConsent,
  guardianRoles,
  hasGuardianConsent,
  isGuardianRole,
  parseGuardianConsent
} from "./guardianConsent";

describe("who may authorise", () => {
  it("accepts only the two adults the project recognises", () => {
    expect(guardianRoles).toEqual(["parent", "teacher"]);
    expect(isGuardianRole("parent")).toBe(true);
    expect(isGuardianRole("teacher")).toBe(true);
    expect(isGuardianRole("child")).toBe(false);
    expect(isGuardianRole(null)).toBe(false);
  });

  it("records the role and the day, the same pair the cloud schema stores", () => {
    expect(grantGuardianConsent("teacher", "2026-08-05")).toEqual({
      role: "teacher",
      authorizedOn: "2026-08-05",
      syncPending: true
    });
  });

  it("refuses to record consent it cannot date", () => {
    expect(grantGuardianConsent("parent", "not-a-day")).toBeNull();
    expect(grantGuardianConsent("nobody" as never, "2026-08-05")).toBeNull();
  });

  it("starts with nothing synced, because nothing has left the phone", () => {
    expect(grantGuardianConsent("parent", "2026-08-05")?.syncPending).toBe(true);
  });
});

describe("reading stored consent", () => {
  it("keeps a valid record", () => {
    const stored = { role: "parent", authorizedOn: "2026-08-05", syncPending: true };

    expect(parseGuardianConsent(stored)).toEqual(stored);
  });

  it("treats anything unreadable as no consent at all", () => {
    expect(parseGuardianConsent(undefined)).toBeNull();
    expect(parseGuardianConsent("yes")).toBeNull();
    expect(parseGuardianConsent({ role: "parent" })).toBeNull();
    expect(parseGuardianConsent({ role: "hacker", authorizedOn: "2026-08-05" })).toBeNull();
    expect(parseGuardianConsent({ role: "parent", authorizedOn: "2026-02-31" })).toBeNull();
  });

  it("never assumes a yes from corrupt data", () => {
    expect(hasGuardianConsent(parseGuardianConsent({}))).toBe(false);
    expect(hasGuardianConsent(null)).toBe(false);
    expect(hasGuardianConsent(grantGuardianConsent("parent", "2026-08-05"))).toBe(true);
  });
});

describe("what the record does not hold", () => {
  it("stores a role and a date, and nothing that could identify a person", () => {
    const consent = grantGuardianConsent("parent", "2026-08-05");

    expect(Object.keys(consent ?? {})).toEqual(["role", "authorizedOn", "syncPending"]);
    // No email, no name, no phone: there is no field for them and never was.
    expect(JSON.stringify(consent)).not.toMatch(/mail|name|phone|nombre|correo/i);
  });
});

describe("what the adult is told before deciding", () => {
  it("spells out every promise in Spanish and English", () => {
    for (const { locale, messages } of [
      { locale: "en", messages: englishMessages },
      { locale: "es", messages: spanishMessages }
    ] as const) {
      const t = createTranslator({ locale, messages, namespace: "guardian" });

      for (const key of consentPromiseKeys) {
        expect(t(`promises.${key}`), `${locale}.${key}`).toEqual(expect.any(String));
        expect(t(`promises.${key}`).trim().length).toBeGreaterThan(0);
      }
      for (const role of guardianRoles) {
        expect(t(`roles.${role}`), `${locale}.${role}`).toEqual(expect.any(String));
      }
    }
  });

  it("says plainly that nothing has been uploaded yet", () => {
    for (const { locale, messages } of [
      { locale: "en", messages: englishMessages },
      { locale: "es", messages: spanishMessages }
    ] as const) {
      const t = createTranslator({ locale, messages, namespace: "guardian" });
      const promise = t("promises.nothingYet").toLowerCase();

      expect(promise).toMatch(/por ahora no se sube|todavía|aún|not yet|nothing is uploaded/);
    }
  });
});
