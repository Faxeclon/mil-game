import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "./en.json";
import spanishMessages from "./es.json";

/**
 * What the scanning screen promises a teacher, in both languages.
 *
 * A camera pointed at a classroom of children is the most sensitive thing this project
 * does. The promise that no picture is kept and no face is recognised is not decoration:
 * it is the reason a school can allow this at all, so it is pinned here rather than left
 * to whoever edits the copy next.
 */
const locales = [
  { locale: "en", messages: englishMessages },
  { locale: "es", messages: spanishMessages }
] as const;

/*
 * The screen no longer prints a privacy promise, so there is no promise here to guard.
 * What it described is still true of the code - frames are read and discarded, nothing is
 * stored and nothing is sent - and `cardScanner` is where that is enforced and tested.
 */
describe("what the camera screen promises", () => {
  it("gives each camera failure its own way out instead of one dead end", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "scan" });
      const denied = t("camera.denied");
      const unavailable = t("camera.unavailable");
      const unsupported = t("camera.unsupported");

      expect(new Set([denied, unavailable, unsupported]).size).toBe(3);
    }
  });

  it("refuses to guess at a sideways card and says what to do about it", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "scan" });

      expect(t("announceAmbiguous", { number: 7 })).toContain("7");
      expect(t("announceAmbiguous", { number: 7 }).toLowerCase()).toMatch(/sideways|de lado/);
    }
  });

  it("writes the running count without leaving a placeholder showing", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "scan" });

      expect(t("scannedOf", { done: 18, total: 25 })).not.toMatch(/\{done\}|\{total\}/);
      expect(t("scannedOf", { done: 18, total: 25 })).toContain("18");
      expect(t("groupResult", { right: 11, total: 25 })).not.toMatch(/\{right\}|\{total\}/);
      expect(t("announceAnswer", { number: 4, answer: "A" })).toContain("4");
    }
  });

  /*
   * The cards screen used to say scanning was coming soon. It is here now, so the promise
   * has to have been withdrawn - a product about telling real from fake cannot leave a
   * stale "coming soon" sitting next to a feature that works.
   */
  it("no longer calls scanning a future feature on the cards screen", () => {
    for (const { locale, messages } of locales) {
      const lead = createTranslator({ locale, messages, namespace: "cards" })("lead").toLowerCase();

      expect(lead).not.toMatch(/coming soon|próximamente|proximamente/);
    }
  });
});
