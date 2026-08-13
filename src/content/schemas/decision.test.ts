import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { decisionPacks } from "@/content/packs/packRegistry";
import { validateDecisionPack } from "./decision";

const wellFormed = {
  id: "decision-test-v1",
  kind: "share",
  rounds: [
    {
      id: "r1",
      order: 1,
      situationKey: "s",
      questionKey: "q",
      options: [
        { id: "a", labelKey: "la", whyKey: "wa" },
        { id: "b", labelKey: "lb", whyKey: "wb" }
      ],
      answerId: "b",
      rememberKey: "rk"
    }
  ]
};

/** Follows a dotted key into a messages object, or gives back nothing. */
function lookup(messages: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) return (value as Record<string, unknown>)[key];
    return undefined;
  }, messages);
}

describe("what a decision pack is allowed to be", () => {
  it("accepts a well-formed pack", () => {
    expect(validateDecisionPack(wellFormed).rounds).toHaveLength(1);
  });

  /*
   * The failure worth shouting about. A round that answers with an option it does not
   * offer is a mission no child can ever pass, and it would look completely fine in a
   * diff - so it fails at build time rather than in front of a class.
   */
  it("refuses a round whose answer is not one of its own options", () => {
    expect(() =>
      validateDecisionPack({ ...wellFormed, rounds: [{ ...wellFormed.rounds[0], answerId: "ghost" }] })
    ).toThrow(/its own options/);
  });

  it("refuses a round with only one thing to choose", () => {
    expect(() =>
      validateDecisionPack({
        ...wellFormed,
        rounds: [{ ...wellFormed.rounds[0], options: [wellFormed.rounds[0].options[0]], answerId: "a" }]
      })
    ).toThrow(/at least two options/);
  });

  it("refuses two options sharing an id, which would make the answer ambiguous", () => {
    expect(() =>
      validateDecisionPack({
        ...wellFormed,
        rounds: [
          {
            ...wellFormed.rounds[0],
            options: [
              { id: "a", labelKey: "la", whyKey: "wa" },
              { id: "a", labelKey: "lb", whyKey: "wb" }
            ]
          }
        ]
      })
    ).toThrow(/repeats an option id/);
  });

  it("refuses rounds numbered out of order", () => {
    expect(() =>
      validateDecisionPack({ ...wellFormed, rounds: [{ ...wellFormed.rounds[0], order: 7 }] })
    ).toThrow(/must declare order 1/);
  });

  it("refuses a pack with no rounds and a kind nobody offers", () => {
    expect(() => validateDecisionPack({ ...wellFormed, rounds: [] })).toThrow(/no rounds/);
    expect(() => validateDecisionPack({ ...wellFormed, kind: "quiz" })).toThrow(/unknown kind/);
  });
});

describe("the packs that actually ship", () => {
  /*
   * Every key these rounds ask for must exist in both languages. A missing one is not a
   * crash - next-intl prints the key itself - so a child would be offered "share.whyIgnore"
   * as a course of action, which is the kind of thing nobody notices until a demo.
   */
  it("has every situation, option and lesson written in both languages", () => {
    for (const pack of Object.values(decisionPacks)) {
      for (const round of pack.rounds) {
        const keys = [
          round.situationKey,
          round.questionKey,
          round.rememberKey,
          ...round.options.flatMap((option) => [option.labelKey, option.whyKey])
        ];
        for (const key of keys) {
          expect(lookup(spanishMessages.decisions, key), `es: decisions.${key}`).toBeTypeOf("string");
          expect(lookup(englishMessages.decisions, key), `en: decisions.${key}`).toBeTypeOf("string");
        }
      }
    }
  });

  /*
   * These missions are the game's answer to "what do I do now", so the option that wins
   * must never be the one that passes something on unchecked. Read off the answer's own
   * explanation, which is the text a child is left with.
   */
  it("never rewards spreading something before checking it", () => {
    for (const pack of Object.values(decisionPacks)) {
      for (const round of pack.rounds) {
        const answer = round.options.find((option) => option.id === round.answerId);
        const why = String(lookup(spanishMessages.decisions, answer!.whyKey)).toLowerCase();
        expect(why).not.toMatch(/reenv[íi]alo|mándalo|compártelo de una vez/);
      }
    }
  });

  /*
   * The documented failure mode of games like this one is teaching children to distrust
   * everything rather than to tell things apart, and the two newest missions are where it
   * would happen: every round is about somebody who might be trying to influence you, or a
   * machine that might be wrong. Answer "refuse" every time and a child learns that the
   * safe move is always no, which is not judgement - it is the absence of it.
   *
   * So each of those missions carries a round whose right answer is to accept: the creator
   * who says up front that she was paid, and the tool that admits it does not know. Both
   * of them are trustworthy precisely because they told you where they stood, which is the
   * lesson that distrusting everything would erase.
   */
  it("rewards trusting the ones who were honest, not only refusing", () => {
    const rightAnswerOf = (packId: string, roundId: string) =>
      decisionPacks[packId]?.rounds.find((round) => round.id === roundId)?.answerId;

    expect(rightAnswerOf("decision-influence-v1", "decision-influence-round-3")).toBe("listenKnowing");
    expect(rightAnswerOf("decision-limits-v1", "decision-limits-round-3")).toBe("goodSign");
  });

  it("keeps the decision lessons short, evidence-based and aligned in both languages", () => {
    const message = (language: typeof spanishMessages, key: string) =>
      lookup(language.decisions, key);

    expect(message(spanishMessages, "source.noClass.question")).toBe("¿Dónde lo compruebas?");
    expect(message(englishMessages, "source.noClass.question")).toBe("Where do you check it?");
    expect(message(spanishMessages, "source.noClass.official")).toBe("En la página del colegio");
    expect(message(spanishMessages, "source.noClass.crowd")).toBe("Por cuántas veces se compartió");
    expect(message(spanishMessages, "source.noClass.askGroup")).toBe("En el grupo del salón");

    expect(message(spanishMessages, "source.noSource.wait")).toBe("Todavía no sé");
    expect(message(englishMessages, "source.noSource.wait")).toBe("I do not know yet");
    expect(message(spanishMessages, "influence.giveaway.askWhoRuns")).toBe(
      "Que la app cree que seguirás mirando"
    );
    expect(message(englishMessages, "influence.giveaway.askWhoRuns")).toBe(
      "The app thinks you will keep watching"
    );
    expect(message(spanishMessages, "limits.homework.checkAndCredit")).toBe(
      "Busco otras fuentes y puntos de vista"
    );
    expect(message(englishMessages, "limits.homework.checkAndCredit")).toBe(
      "Look for other sources and viewpoints"
    );
    expect(message(spanishMessages, "share.poster.saySo")).toBe(
      "Ilustración creada con ayuda de IA"
    );
    expect(message(englishMessages, "share.poster.saySo")).toBe(
      "Illustration created with AI help"
    );

    for (const language of [spanishMessages, englishMessages]) {
      const copy = JSON.stringify(language.decisions).toLowerCase();
      expect(copy).not.toContain("oráculo");
      expect(copy).not.toContain("oracle");
      expect(copy).not.toContain("desconfiar de todo");
      expect(copy).not.toContain("distrusting everybody");
    }
  });
});
