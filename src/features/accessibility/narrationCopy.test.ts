import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

describe("automatic narration settings copy", () => {
  it("describes supported automatic narration without promising a button or every option", () => {
    for (const [locale, messages] of [
      ["en", englishMessages],
      ["es", spanishMessages]
    ] as const) {
      const t = createTranslator({ locale, messages, namespace: "accessModes" });
      const detail = t("readAloudDetail");

      expect(detail.trim().length).toBeGreaterThan(0);
      expect(detail.toLowerCase()).not.toMatch(/button|botón|options|opciones/);
    }
  });
});
