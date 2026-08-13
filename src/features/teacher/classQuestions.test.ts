import { describe, expect, it } from "vitest";
import { getContentPack, getSinglePack } from "@/content/packs/packRegistry";
import { getMissionById, isComparisonMode, missionBlueprint } from "@/features/levels/levelModel";
import { buildClassQuestions, canBeAskedInClass, countAskableRounds } from "./classQuestions";

const playable = missionBlueprint.filter((mission) => mission.packId);

function mission(id: string) {
  const found = getMissionById(id);
  if (!found) throw new Error(`Unknown mission in test: ${id}`);
  return found;
}

describe("turning a mission into questions for a class", () => {
  it("asks a comparison as two pictures, labelled the way the card is printed", () => {
    const questions = buildClassQuestions(mission("animals-1"));

    expect(questions).toHaveLength(3);
    for (const question of questions) {
      expect(question.kind).toBe("compare");
      expect(question.media).toHaveLength(2);
      expect(question.labelKeys).toEqual(["answerA", "answerB"]);
      expect(["A", "B"]).toContain(question.correct);
    }
  });

  it("puts the left picture on A and the right one on B", () => {
    const pack = getContentPack("animals-compare-v1")!;
    const questions = buildClassQuestions(mission("animals-1"));

    pack.rounds.forEach((round, index) => {
      const correct = round.choices.find((choice) => choice.id === round.correctChoiceId)!;
      expect(questions[index].correct).toBe(correct.position === "left" ? "A" : "B");
      expect(questions[index].media[0]).toBe(round.choices.find((c) => c.position === "left")!.media);
    });
  });

  /*
   * The card's two sides do not always mean the same thing. With one picture there is
   * nothing to compare, so the sides become the answers themselves.
   */
  it("asks a single picture as who-made-it, not as which-one", () => {
    const questions = buildClassQuestions(mission("creators-2"));

    expect(questions).toHaveLength(3);
    for (const question of questions) {
      expect(question.kind).toBe("single");
      expect(question.media).toHaveLength(1);
      expect(question.labelKeys).toEqual(["optionAi", "optionCamera"]);
    }
  });

  it("puts made-with-AI on A and taken-with-a-camera on B", () => {
    const pack = getSinglePack("creators-single-v1")!;
    const questions = buildClassQuestions(mission("creators-2"));

    pack.rounds.forEach((round, index) => {
      expect(questions[index].correct).toBe(round.answer === "ai-generated" ? "A" : "B");
    });
  });
});

describe("the answer a card cannot give", () => {
  /*
   * "You cannot tell by looking" is the most valuable answer in the game. A card has two
   * sides and no way to say it, so those rounds are left for the phone instead of being
   * flattened onto whichever side is closer.
   */
  it("leaves out the rounds whose answer is that you cannot tell", () => {
    const pack = getSinglePack("creators-uncertain-v1")!;
    const uncertain = pack.rounds.filter((round) => round.answer === "unknown").length;
    const questions = buildClassQuestions(mission("creators-1"));

    expect(uncertain).toBeGreaterThan(0);
    expect(questions).toHaveLength(pack.rounds.length - uncertain);
    expect(questions.every((question) => question.correct === "A" || question.correct === "B")).toBe(true);
  });

  it("tells the teacher how many rounds the cards can carry", () => {
    expect(countAskableRounds(mission("animals-1"))).toEqual({ askable: 3, total: 3 });

    const creators = countAskableRounds(mission("creators-1"));
    expect(creators.askable).toBeLessThan(creators.total);
  });
});

describe("every mission the game has", () => {
  it("offers at least one question to a class, whatever kind of mission it is", () => {
    for (const entry of playable) {
      expect(canBeAskedInClass(entry), entry.id).toBe(true);
    }
  });

  it("covers the single-image missions too, not only the comparisons", () => {
    const singles = playable.filter((entry) => !isComparisonMode(entry.mode));

    expect(singles.length).toBeGreaterThan(0);
    for (const entry of singles) {
      expect(buildClassQuestions(entry).length, entry.id).toBeGreaterThan(0);
    }
  });

  it("never invents a question for a mission without content", () => {
    expect(buildClassQuestions({ id: "ghost", category: "animals", order: 9, mode: "compare" })).toEqual([]);
    expect(canBeAskedInClass({ id: "ghost", category: "animals", order: 9, mode: "compare" })).toBe(false);
  });

  it("gives every question a distinct id, so two cannot be confused in a lesson", () => {
    for (const entry of playable) {
      const ids = buildClassQuestions(entry).map((question) => question.id);
      expect(new Set(ids).size, entry.id).toBe(ids.length);
    }
  });
});
