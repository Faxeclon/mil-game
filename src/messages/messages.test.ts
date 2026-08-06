import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "./en.json";
import spanishMessages from "./es.json";

/** Every leaf key of a message tree, as dotted paths, so two languages can be compared. */
function collectKeys(messages: unknown, prefix = ""): string[] {
  if (typeof messages !== "object" || messages === null) return [prefix];
  if (Array.isArray(messages)) return [prefix];

  return Object.entries(messages).flatMap(([key, value]) =>
    collectKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

const spanishKeys = collectKeys(spanishMessages);
const englishKeys = collectKeys(englishMessages);

describe("Spanish and English stay in step", () => {
  it("has the very same keys in both languages", () => {
    const missingInEnglish = spanishKeys.filter((key) => !englishKeys.includes(key));
    const missingInSpanish = englishKeys.filter((key) => !spanishKeys.includes(key));

    expect(missingInEnglish, "missing from en.json").toEqual([]);
    expect(missingInSpanish, "missing from es.json").toEqual([]);
  });

  it("leaves no message empty in either language", () => {
    for (const [locale, messages] of [
      ["es", spanishMessages],
      ["en", englishMessages]
    ] as const) {
      const empty = collectKeys(messages).filter((key) => {
        const value = key.split(".").reduce<unknown>(
          (current, part) =>
            typeof current === "object" && current !== null
              ? (current as Record<string, unknown>)[part]
              : undefined,
          messages
        );
        return typeof value === "string" && value.trim().length === 0;
      });

      expect(empty, `empty in ${locale}.json`).toEqual([]);
    }
  });
});

describe("the versus wording", () => {
  const locales = [
    { locale: "en", messages: englishMessages },
    { locale: "es", messages: spanishMessages }
  ] as const;

  it("names both players, the handover and the outcome, with no placeholder left showing", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "versus" });
      const playerOne = t("playerOne");

      expect(playerOne).not.toBe(t("playerTwo"));
      expect(t("handTo", { player: playerOne })).toContain(playerOne);
      expect(t("ready", { player: playerOne })).toContain(playerOne);
      expect(t("winner", { player: playerOne })).toContain(playerOne);
      expect(t("turn", { current: 2, total: 6 })).not.toMatch(/\{current\}|\{total\}/);
      expect(t("ruleTurns", { turns: 3 })).toContain("3");
      expect(t("draw")).not.toBe(t("winner", { player: playerOne }));
    }
  });

  it("promises no account, no connection and nothing stored", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "versus" });
      const privacy = t("privacy").toLowerCase();

      expect(privacy).toMatch(/cuenta|account/);
      expect(privacy).toMatch(/internet/);
    }
  });
});
