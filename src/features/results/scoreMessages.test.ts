import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

const locales = [
  { locale: "en", messages: englishMessages },
  { locale: "es", messages: spanishMessages }
] as const;

/** Every string the score block can render, so neither language falls back to a key. */
const scoreKeys = [
  "scoreLabel",
  "bestScoreLabel",
  "newRecord",
  "newRecordHint",
  "scoreUnavailable",
  "noBestScore"
] as const;

describe("score wording in both languages", () => {
  it("has every fixed score string in Spanish and English", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "results" });
      for (const key of scoreKeys) {
        expect(t(key), `${locale}.${key}`).toEqual(expect.any(String));
        expect(t(key).trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("writes a score with its unit, never leaving the placeholder visible", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "results" });

      expect(t("scorePoints", { score: 840 })).toContain("840");
      expect(t("scorePoints", { score: 840 })).not.toMatch(/\{score\}/);
      // A single point reads differently from many, in both languages.
      expect(t("scorePoints", { score: 1 })).not.toBe(t("scorePoints", { score: 2 }).replace("2", "1"));
    }
  });

  it("names the stars for a screen reader at every count", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "results" });

      for (const stars of [0, 1, 2, 3]) {
        const label = t("starsAria", { stars, total: 3 });
        expect(label, `${locale} ${stars}`).not.toMatch(/\{stars\}|\{total\}/);
        expect(label.trim().length).toBeGreaterThan(0);
      }
      expect(t("starsAria", { stars: 1, total: 3 })).not.toBe(t("starsAria", { stars: 3, total: 3 }));
    }
  });
});
