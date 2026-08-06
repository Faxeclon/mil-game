import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import {
  consentPromiseKeys,
  grantGuardianConsent,
  hasGuardianConsent,
  parseGuardianConsent
} from "./guardianConsent";

const locales = [
  { locale: "en", messages: englishMessages },
  { locale: "es", messages: spanishMessages }
] as const;

describe("recording that an adult said yes", () => {
  it("records the day and nothing else", () => {
    expect(grantGuardianConsent("2026-08-05")).toEqual({
      authorizedOn: "2026-08-05",
      syncPending: true
    });
  });

  it("refuses to record consent it cannot date", () => {
    expect(grantGuardianConsent("not-a-day")).toBeNull();
    expect(grantGuardianConsent("2026-02-31")).toBeNull();
  });

  it("starts with nothing synced, because nothing has left the phone", () => {
    expect(grantGuardianConsent("2026-08-05")?.syncPending).toBe(true);
  });

  it("holds nothing that could identify a person", () => {
    const consent = grantGuardianConsent("2026-08-05");

    expect(Object.keys(consent ?? {})).toEqual(["authorizedOn", "syncPending"]);
    // No email, no name, no phone: there is no field for them and never was.
    expect(JSON.stringify(consent)).not.toMatch(/mail|name|phone|nombre|correo/i);
  });
});

describe("reading stored consent", () => {
  it("keeps a valid record", () => {
    const stored = { authorizedOn: "2026-08-05", syncPending: true };

    expect(parseGuardianConsent(stored)).toEqual(stored);
  });

  it("treats anything unreadable as no consent at all", () => {
    expect(parseGuardianConsent(undefined)).toBeNull();
    expect(parseGuardianConsent("yes")).toBeNull();
    expect(parseGuardianConsent({})).toBeNull();
    expect(parseGuardianConsent({ authorizedOn: "2026-02-31" })).toBeNull();
  });

  it("never assumes a yes from corrupt data", () => {
    expect(hasGuardianConsent(parseGuardianConsent({}))).toBe(false);
    expect(hasGuardianConsent(null)).toBe(false);
    expect(hasGuardianConsent(grantGuardianConsent("2026-08-05"))).toBe(true);
  });

  it("ignores extra fields somebody may have added by hand", () => {
    const parsed = parseGuardianConsent({
      authorizedOn: "2026-08-05",
      syncPending: true,
      email: "someone@example.com"
    });

    expect(parsed).toEqual({ authorizedOn: "2026-08-05", syncPending: true });
    expect(JSON.stringify(parsed)).not.toContain("example.com");
  });
});

describe("what the adult is told before deciding", () => {
  it("spells out every promise in Spanish and English", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "guardian" });

      for (const key of consentPromiseKeys) {
        expect(t(`promises.${key}`), `${locale}.${key}`).toEqual(expect.any(String));
        expect(t(`promises.${key}`).trim().length).toBeGreaterThan(0);
      }
      expect(t("accept").trim().length).toBeGreaterThan(0);
    }
  });

  it("says plainly that nothing has been uploaded yet", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "guardian" });
      const promise = t("promises.nothingYet").toLowerCase();

      expect(promise).toMatch(/por ahora no se sube|todavía|aún|not yet|nothing is uploaded/);
    }
  });
});
