import { describe, expect, it } from "vitest";
import english from "./en.json";
import spanish from "./es.json";

const locales = [english.education, spanish.education];

function collectText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(collectText);
  return [];
}

const activeTutorialFeedback = {
  en: collectText(english.tutorial.packs).join(" ").toLowerCase(),
  es: collectText(spanish.tutorial.packs).join(" ").toLowerCase()
};

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

  it("does not turn hands, ordinary scenes or AI mistakes into universal detection rules", () => {
    expect(activeTutorialFeedback.en).not.toMatch(/hands? and (the )?feet[^.]{0,80}hardest to fake/);
    expect(activeTutorialFeedback.es).not.toMatch(/manos? y (los )?pies[^.]{0,80}difícil de (imitar|falsificar)/);
    expect(activeTutorialFeedback.en).not.toMatch(/ordinary and dull[^.]{0,40}(is|means) real/);
    expect(activeTutorialFeedback.es).not.toMatch(/común y aburrido[^.]{0,40}(es|significa) real/);
    expect(activeTutorialFeedback.en).not.toMatch(/ai (always|usually) (slips|fails)/);
    expect(activeTutorialFeedback.es).not.toMatch(/la ia (siempre|suele) fallar/);
    expect(activeTutorialFeedback.en).not.toMatch(/proves? it is ai|gives ai away/);
    expect(activeTutorialFeedback.es).not.toMatch(/demuestra que es ia|delata que es ia/);
  });

  it("keeps concrete scene clues while teaching their limits", () => {
    expect(english.tutorial.packs.sportsCompare.r1.observation).toContain("hands and feet");
    expect(english.tutorial.packs.sportsCompare.r1.observation).toContain("not proof");
    expect(spanish.tutorial.packs.sportsCompare.r1.observation).toContain("manos y los pies");
    expect(spanish.tutorial.packs.sportsCompare.r1.observation).toContain("no una prueba");
  });

  it("teaches that a visually ordinary or correct image can still be AI-generated", () => {
    expect(english.tutorial.packs.animalsSingle.r2.remember).toContain("can still be made with AI");
    expect(spanish.tutorial.packs.animalsSingle.r2.remember).toContain("no demuestra que sea real");
    expect(english.tutorial.packs.sportsSingle.r1.remember).toContain("can look correct too");
    expect(spanish.tutorial.packs.sportsSingle.r1.remember).toContain("puede verse correcta");
  });

  it("points children to source and context where those checks are available", () => {
    expect(english.tutorial.packs.animalsSingle.r2.remember).toContain("source and context");
    expect(spanish.tutorial.packs.animalsSingle.r2.remember).toContain("fuente y el contexto");
    expect(english.tutorial.packs.sportsSingle.r1.remember).toContain("Check the source");
    expect(spanish.tutorial.packs.sportsSingle.r1.remember).toContain("Revisa la fuente");
  });

  it("keeps the zoom hint as a clue rather than a visual verdict", () => {
    expect(spanish.zoom.hint).toContain("pista");
    expect(spanish.zoom.hint).toContain("no una prueba");
    expect(english.zoom.hint).toContain("clue");
    expect(english.zoom.hint).toContain("not proof");
    expect(`${spanish.zoom.hint} ${english.zoom.hint}`.toLowerCase()).not.toMatch(/delatan|give it away/);
  });
});
