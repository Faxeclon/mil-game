import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { completeLevel, initialProgressState } from "./progressState";

const locales = [
  { locale: "en", messages: englishMessages },
  { locale: "es", messages: spanishMessages }
] as const;

const attempt = {
  attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
  correctRounds: 3,
  totalRounds: 3,
  elapsedMs: 9_000,
  completedAt: "2025-01-02T03:04:05.000Z",
  score: 900
};

describe("telling the player where their progress lives", () => {
  it("has every storage message in Spanish and English", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "storage" });

      for (const key of [
        "guestBadge",
        "guestBadgeAria",
        "guestNotice",
        "guestDetail",
        "roquiSaveTitle",
        "roquiSaveHint",
        "accountSoon"
      ] as const) {
        expect(t(key), `${locale}.${key}`).toEqual(expect.any(String));
        expect(t(key).trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("says where the progress is kept instead of claiming nothing is saved", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "storage" });
      const notice = t("guestNotice").toLowerCase();

      expect(notice).toMatch(/celular|phone|dispositivo|device/);
      expect(notice).not.toMatch(/no se guarda|nothing is saved|not saved/);
    }
  });

  it("describes one active local profile rather than a future account", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "storage" });

      expect(t("guestBadge").toLowerCase()).toMatch(/perfil|profile/);
      expect(t("guestNotice").toLowerCase()).toMatch(/activo|active/);
      expect(t("roquiSaveHint").toLowerCase()).not.toMatch(/account|cuenta/);
    }
  });
});

describe("when Roqui offers to keep the medal", () => {
  it("is the moment the very first mission is finished, never before", () => {
    expect(initialProgressState.completedLevelIds).toHaveLength(0);

    const first = completeLevel(initialProgressState, "basics-1", attempt);
    expect(first.completedLevelIds).toHaveLength(1);
  });

  it("is not offered again once a second mission is finished", () => {
    const first = completeLevel(initialProgressState, "basics-1", attempt);
    const second = completeLevel(first, "basics-2", { ...attempt, attemptId: "attempt_223e4567-e89b-12d3-a456-426614174000" });

    expect(second.completedLevelIds).toHaveLength(2);
  });

  it("still stands while the player has only that one medal, replay or not", () => {
    const first = completeLevel(initialProgressState, "basics-1", attempt);
    const replayed = completeLevel(first, "basics-1", {
      ...attempt,
      attemptId: "attempt_323e4567-e89b-12d3-a456-426614174000"
    });

    // A replay never adds a second entry, so the message stays true: one medal, one phone.
    expect(replayed.completedLevelIds).toHaveLength(1);
  });
});
