import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

type MessageTree = Record<string, unknown>;

const finalLevelPackFiles = [
  "introductory-tutorial.json",
  "city-basics-timed.json",
  "animals-compare.json",
  "animals-timed.json",
  "animals-single.json",
  "sports-compare.json"
] as const;

function messageAt(messages: MessageTree, key: string): unknown {
  return key.split(".").reduce<unknown>((value, part) => {
    return typeof value === "object" && value !== null ? (value as MessageTree)[part] : undefined;
  }, messages.tutorial);
}

describe("final level feedback", () => {
  it("keeps all 18 final-media rounds localized without placeholder media", () => {
    let roundCount = 0;
    for (const file of finalLevelPackFiles) {
      const pack = JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), "utf8"));
      expect(pack.rounds).toHaveLength(3);
      for (const round of pack.rounds) {
        roundCount += 1;
        expect(messageAt(spanishMessages as MessageTree, round.promptKey)).toEqual(expect.any(String));
        expect(messageAt(englishMessages as MessageTree, round.promptKey)).toEqual(expect.any(String));
        for (const key of Object.values(round.feedback)) {
          expect(messageAt(spanishMessages as MessageTree, key as string)).toEqual(expect.any(String));
          expect(messageAt(englishMessages as MessageTree, key as string)).toEqual(expect.any(String));
        }
        const media = round.choices ? round.choices.map((choice: { media: { src: string } }) => choice.media) : [round.media];
        for (const asset of media) expect(asset.src).not.toContain("/placeholders/");
      }
    }
    expect(roundCount).toBe(18);
  });

  it("keeps final feedback concise in both languages", () => {
    for (const messages of [spanishMessages, englishMessages]) {
      for (const file of finalLevelPackFiles) {
        const pack = JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), "utf8"));
        for (const round of pack.rounds) {
          for (const key of Object.values(round.feedback)) {
            const text = messageAt(messages as MessageTree, key as string) as string;
            expect(text.split(/\s+/).length).toBeLessThanOrEqual(18);
            expect(text).not.toContain("\n");
          }
        }
      }
    }
  });

  it("keeps feedback tied to the current final-media scenes", () => {
    const spanishFeedback = JSON.stringify({ packs: spanishMessages.tutorial.packs, rounds: spanishMessages.tutorial.rounds });
    const englishFeedback = JSON.stringify({ packs: englishMessages.tutorial.packs, rounds: englishMessages.tutorial.rounds });

    expect(spanishFeedback).toContain("Una imagen de una emergencia necesita contexto.");
    expect(spanishFeedback).toContain("Mira qué sostiene la ardilla y dónde está.");
    expect(spanishFeedback).toContain("Fíjate en el salto y en los obstáculos.");
    expect(spanishFeedback).toContain("Esta escena es poco común. ¿Habrá ocurrido de verdad?");
    expect(spanishFeedback).not.toContain("Un sello visible no confirma el origen.");
    expect(spanishFeedback).not.toContain("Que sea viral no la vuelve verdadera.");
    expect(spanishFeedback).not.toContain("Que Messi aparezca ahí no prueba que ese momento ocurrió.");
    expect(spanishFeedback).not.toContain("Mira la acción y los balones en toda la escena.");

    expect(englishFeedback).toContain("An emergency image needs context.");
    expect(englishFeedback).toContain("Look at what the squirrel is holding and where it is.");
    expect(englishFeedback).toContain("Look at the jump and the obstacles.");
    expect(englishFeedback).toContain("This scene is unusual. Did it really happen?");
    expect(englishFeedback).not.toContain("A visible stamp does not confirm the origin.");
    expect(englishFeedback).not.toContain("Being viral does not make it true.");
    expect(englishFeedback).not.toContain("Seeing Messi there does not prove that moment happened.");
    expect(englishFeedback).not.toContain("Look at the action and balls across the whole scene.");
  });

  it("uses the localized Settings label and icon in the desktop header", async () => {
    expect(spanishMessages.header.settings).toBe("Configuración");
    expect(englishMessages.header.settings).toBe("Settings");
    expect(spanishMessages.header.accessibility).toBe("Opciones de accesibilidad");
    const header = readFileSync(new URL("../../components/AppHeader.tsx", import.meta.url), "utf8");
    expect(header).toContain('t("settings")');
    expect(header).toContain("SlidersHorizontal");
    expect(header).not.toContain('<span>{t("accessibility")}</span>');
  });
});
