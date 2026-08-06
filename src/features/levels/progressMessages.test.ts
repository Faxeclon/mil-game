import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { initialProgressState } from "@/features/progress/progressState";
import { islandOrder } from "./levelModel";
import { getGlobalProgress, getIslandProgress } from "./progressSummary";

const locales = [
  { locale: "en", messages: englishMessages },
  { locale: "es", messages: spanishMessages }
] as const;

describe("progress wording in both languages", () => {
  it("writes the island counter and its percentage for every island", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "islands" });

      for (const island of islandOrder) {
        const summary = getIslandProgress(initialProgressState, island);
        const counter = t("islandProgress", { done: summary.done, total: summary.total });
        const percent = t("percent", { percent: summary.percent });

        expect(counter, `${locale} ${island}`).not.toMatch(/\{done\}|\{total\}/);
        expect(percent, `${locale} ${island}`).toContain(String(summary.percent));
        expect(t("islandProgressAria", { done: summary.done, total: summary.total })).not.toMatch(
          /\{done\}|\{total\}/
        );
      }

      expect(t("islandEmpty").trim().length).toBeGreaterThan(0);
    }
  });

  it("explains a locked mission and a coming-soon one in different words", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "islands" });
      const blocking = t("missionIdentity", { category: t("categories.basics.title"), number: 2 });

      expect(blocking).not.toMatch(/\{category\}|\{number\}/);
      expect(t("lockedBy", { mission: blocking })).toContain(blocking);
      expect(t("lockedGeneric")).not.toBe(t("comingSoonHint"));
      expect(t("comingSoon")).not.toBe(t("lockedGeneric"));
    }
  });

  it("writes a mission's best score without leaving the placeholder visible", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "islands" });

      expect(t("missionBest", { score: 840 })).toContain("840");
      expect(t("missionBest", { score: 840 })).not.toMatch(/\{score\}/);
      expect(t("starsAria", { stars: 2, total: 3 })).not.toMatch(/\{stars\}|\{total\}/);
    }
  });

  it("writes the overall hub progress, and says missions rather than levels", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "home" });
      const overall = getGlobalProgress(initialProgressState);
      const value = t("progressValue", { done: overall.done, total: overall.total });

      expect(value).not.toMatch(/\{done\}|\{total\}/);
      expect(value.toLowerCase()).not.toMatch(/level|nivel/);
      expect(t("progressPercent", { percent: overall.percent })).toContain("0");
      expect(t("progressAria", { done: overall.done, total: overall.total })).not.toMatch(
        /\{done\}|\{total\}/
      );
      expect(t("hubIslandLabel").trim().length).toBeGreaterThan(0);
    }
  });

  it("gives the map a different word for a closed island and an island not built yet", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "worlds" });

      expect(t("lockedIsland")).not.toBe(t("comingSoon"));
      expect(t("lockedIsland").trim().length).toBeGreaterThan(0);
      // "source" has no playable missions, so the map must say coming soon, not locked.
      expect(getIslandProgress(initialProgressState, "source").isEmpty).toBe(true);
      expect(getIslandProgress(initialProgressState, "training").isEmpty).toBe(false);
    }
  });

  it("counts an island on the map without leaving a placeholder behind", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "worlds" });
      const summary = getIslandProgress(initialProgressState, "training");

      expect(t("islandCount", { done: summary.done, total: summary.total })).toBe(`0/${summary.total}`);
      expect(t("islandCountAria", { done: summary.done, total: summary.total })).not.toMatch(
        /\{done\}|\{total\}/
      );
    }
  });

  it("still offers rank, streak and friends only as coming soon, with no rank tier left", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "home" });
      const hubText = [t("hubRank"), t("hubStreak"), t("hubFriends"), t("hubSoon")].join(" ").toLowerCase();

      expect(t("hubSoon").trim().length).toBeGreaterThan(0);
      expect(hubText).not.toMatch(/bronze|bronce|silver|plata|gold|oro/);
    }
  });
});
