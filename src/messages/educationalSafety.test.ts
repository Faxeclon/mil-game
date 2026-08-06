import { describe, expect, it } from "vitest";
import english from "./en.json";
import spanish from "./es.json";

const locales = [english.education, spanish.education];

describe("active educational feedback", () => {
  it("treats visual clues as uncertain and directs learners to evidence", () => {
    for (const education of locales) {
      const text = Object.values(education).flat().join(" ").toLowerCase();
      expect(text).toMatch(/clue|pista/);
      expect(text).toMatch(/not proof|no es una prueba/);
      expect(text).toMatch(/source|fuente/);
      expect(text).toMatch(/evidence|evidencia/);
    }
  });

  it("separates origin from truthfulness", () => {
    expect(english.education.briefing.join(" ")).toContain("not automatically false");
    expect(english.education.briefing.join(" ")).toContain("not automatically trustworthy");
    expect(spanish.education.briefing.join(" ")).toContain("no es automáticamente falso");
    expect(spanish.education.briefing.join(" ")).toContain("no es automáticamente confiable");
  });

  it("does not reuse the known deterministic visual rules in active feedback", () => {
    const active = locales.map((education) => Object.values(education).flat().join(" ")).join(" ").toLowerCase();
    for (const phrase of ["hardest to fake", "ordinary and dull", "usually slips", "lo común y aburrido", "suele fallar"]) {
      expect(active).not.toContain(phrase);
    }
  });
});
