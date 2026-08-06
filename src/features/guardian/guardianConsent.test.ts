import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { completeLevel, initialProgressState, authorizeGuardian, withdrawGuardian } from "@/features/progress/progressState";
import {
  consentPromiseKeys,
  grantGuardianConsent,
  hasGuardianConsent,
  normalizeGuardianEmail,
  parseGuardianConsent
} from "./guardianConsent";

const locales = [
  { locale: "en", messages: englishMessages },
  { locale: "es", messages: spanishMessages }
] as const;

describe("the adult's own address", () => {
  it("is taken as typed and tidied up", () => {
    expect(normalizeGuardianEmail("  Papa@Correo.PE ")).toBe("papa@correo.pe");
  });

  it("is never checked, because there is nowhere to check it against", () => {
    // Looking strict would imply a verification that never happens. Only blank is refused.
    expect(normalizeGuardianEmail("papa")).toBe("papa");
    expect(normalizeGuardianEmail("   ")).toBeNull();
    expect(normalizeGuardianEmail("")).toBeNull();
    expect(normalizeGuardianEmail(42)).toBeNull();
    expect(normalizeGuardianEmail("a".repeat(300))).toBeNull();
  });
});

describe("linking a child to an adult", () => {
  it("records the address and the day, and nothing else", () => {
    expect(grantGuardianConsent("papa@correo.pe", "2026-08-06")).toEqual({
      email: "papa@correo.pe",
      authorizedOn: "2026-08-06",
      syncPending: true
    });
  });

  it("refuses a blank address or a day it cannot record", () => {
    expect(grantGuardianConsent("   ", "2026-08-06")).toBeNull();
    expect(grantGuardianConsent("papa@correo.pe", "not-a-day")).toBeNull();
  });

  it("starts with nothing synced, because nothing has left the phone", () => {
    expect(grantGuardianConsent("papa@correo.pe", "2026-08-06")?.syncPending).toBe(true);
  });

  it("holds nothing about the child", () => {
    const consent = grantGuardianConsent("papa@correo.pe", "2026-08-06");

    expect(Object.keys(consent ?? {})).toEqual(["email", "authorizedOn", "syncPending"]);
    expect(JSON.stringify(consent)).not.toMatch(/child|nino|niño|age|edad|school|colegio/i);
  });
});

describe("linking and unlinking beside the progress", () => {
  const attempt = {
    attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
    correctRounds: 3,
    totalRounds: 3,
    elapsedMs: 9_000,
    completedAt: "2026-08-06T12:00:00.000Z",
    score: 900
  };

  it("leaves every medal exactly where it was", () => {
    const played = completeLevel(initialProgressState, "basics-1", attempt);
    const linked = authorizeGuardian(played, "papa@correo.pe", "2026-08-06");

    expect(linked.completedLevelIds).toEqual(played.completedLevelIds);
    expect(linked.bestResultsByLevelId).toEqual(played.bestResultsByLevelId);
    expect(linked.guardian?.email).toBe("papa@correo.pe");
  });

  it("loses nothing when the link is removed", () => {
    const played = completeLevel(initialProgressState, "basics-1", attempt);
    const unlinked = withdrawGuardian(authorizeGuardian(played, "papa@correo.pe", "2026-08-06"));

    expect(unlinked.guardian).toBeNull();
    expect(unlinked.completedLevelIds).toEqual(played.completedLevelIds);
    expect(unlinked.bestResultsByLevelId).toEqual(played.bestResultsByLevelId);
  });

  it("ignores a link it cannot record rather than half-applying it", () => {
    const played = completeLevel(initialProgressState, "basics-1", attempt);

    expect(authorizeGuardian(played, "  ", "2026-08-06")).toBe(played);
  });
});

describe("reading stored consent", () => {
  it("keeps a valid record", () => {
    const stored = { email: "papa@correo.pe", authorizedOn: "2026-08-06", syncPending: true };

    expect(parseGuardianConsent(stored)).toEqual(stored);
  });

  it("treats anything unreadable as no link at all", () => {
    expect(parseGuardianConsent(undefined)).toBeNull();
    expect(parseGuardianConsent("yes")).toBeNull();
    expect(parseGuardianConsent({})).toBeNull();
    expect(parseGuardianConsent({ email: "papa@correo.pe" })).toBeNull();
    expect(parseGuardianConsent({ email: "  ", authorizedOn: "2026-08-06" })).toBeNull();
  });

  it("never assumes a yes from corrupt data", () => {
    expect(hasGuardianConsent(parseGuardianConsent({}))).toBe(false);
    expect(hasGuardianConsent(grantGuardianConsent("papa@correo.pe", "2026-08-06"))).toBe(true);
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

  it("says the address is the adult's and that nothing is sent", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "guardian" });

      expect(t("emailHint").toLowerCase()).toMatch(/niñ|child/);
      expect(t("promises.nothingYet").toLowerCase()).toMatch(/por ahora no se sube|nothing is uploaded/);
      expect(t("withdrawKeeps").toLowerCase()).toMatch(/no se pierde|loses no/);
    }
  });
});
