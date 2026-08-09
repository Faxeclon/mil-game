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

  /*
   * The single idea the game cannot ship without. It used to live in the opening briefing,
   * where it was four sentences of adult prose in front of a child who had not yet seen a
   * picture; it now lands in the feedback, on a decision they just made. What must not
   * change is that it is said at all - a game that only rewards spotting the machine
   * teaches distrust of everything, which is the documented failure of this genre.
   */
  it("separates origin from truthfulness", () => {
    expect(english.education.originVsTruth).toContain("not automatically false");
    expect(english.education.originVsTruth).toContain("not automatically trustworthy");
    expect(spanish.education.originVsTruth).toContain("no es automáticamente falso");
    expect(spanish.education.originVsTruth).toContain("no es automáticamente confiable");
  });

  /* Said where a child reaches it, not merely present in the message files. */
  it("shows that idea somewhere a child actually gets to", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      new URL("../components/TutorialClient.tsx", import.meta.url),
      "utf8"
    );

    expect(source).toContain('tEducation("originVsTruth")');
  });

  /* The briefing's job is to get a child playing, not to teach before they have seen anything. */
  it("keeps the opening briefing down to what it takes to start", () => {
    for (const briefing of [english.education.briefing, spanish.education.briefing]) {
      expect(briefing.length).toBeLessThanOrEqual(3);
      for (const line of briefing) expect(line.length).toBeLessThanOrEqual(90);
    }
  });

  it("does not reuse the known deterministic visual rules in active feedback", () => {
    const active = locales.map((education) => Object.values(education).flat().join(" ")).join(" ").toLowerCase();
    for (const phrase of ["hardest to fake", "ordinary and dull", "usually slips", "lo común y aburrido", "suele fallar"]) {
      expect(active).not.toContain(phrase);
    }
  });

  it("keeps the zoom hint as a clue rather than a visual verdict", () => {
    expect(spanish.zoom.hint).toContain("pista");
    expect(spanish.zoom.hint).toContain("no una prueba");
    expect(english.zoom.hint).toContain("clue");
    expect(english.zoom.hint).toContain("not proof");
    expect(`${spanish.zoom.hint} ${english.zoom.hint}`.toLowerCase()).not.toMatch(/delatan|give it away/);
  });
});
