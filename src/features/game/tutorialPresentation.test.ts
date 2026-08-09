import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { contentPacks, introductoryTutorialPack, singlePacks } from "@/content/packs/packRegistry";
import {
  getChoicePresentation,
  getFeedbackBlocks,
  getLearningStepStates
} from "./tutorialPresentation";

function hasNestedKey(messages: object, key: string): boolean {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

describe("getLearningStepStates", () => {
  it("marks earlier steps completed and the round's own step active", () => {
    expect(getLearningStepStates("visible-clue")).toEqual({ look: "active", ask: "inactive", check: "inactive" });
    expect(getLearningStepStates("source-and-purpose")).toEqual({ look: "completed", ask: "active", check: "inactive" });
    expect(getLearningStepStates("uncertainty")).toEqual({ look: "completed", ask: "completed", check: "active" });
  });
});

describe("getFeedbackBlocks", () => {
  it("shows only the round prompt and reminder across every active mission variant", () => {
    const activePacks = [...Object.values(contentPacks), ...Object.values(singlePacks)];
    for (const pack of activePacks) {
      for (const round of pack.rounds) {
      const blocks = getFeedbackBlocks(round);
      expect(blocks).toHaveLength(2);
      expect(blocks.at(-1)?.labelKey).toBe("remember");
      }
    }
  });

  it("pairs each round with the prompt of its own learning step", () => {
    const [first, second, third] = introductoryTutorialPack.rounds.map(getFeedbackBlocks);
    expect(first[0].labelKey).toBe("look");
    expect(second[0].labelKey).toBe("ask");
    expect(third[0].labelKey).toBe("check");
  });

  it("resolves every feedback key in Spanish and English", () => {
    for (const pack of [...Object.values(contentPacks), ...Object.values(singlePacks)]) {
      for (const round of pack.rounds) {
        for (const block of getFeedbackBlocks(round)) {
          expect(hasNestedKey(spanishMessages.tutorial, block.textKey)).toBe(true);
          expect(hasNestedKey(englishMessages.tutorial, block.textKey)).toBe(true);
          expect(hasNestedKey(spanishMessages.tutorial, block.labelKey)).toBe(true);
          expect(hasNestedKey(englishMessages.tutorial, block.labelKey)).toBe(true);
        }
      }
    }
  });
});

describe("getChoicePresentation", () => {
  it("labels nothing before the answer is confirmed", () => {
    expect(getChoicePresentation({ answerSubmitted: false, selected: true, isAiChoice: false })).toEqual({
      state: "selected",
      labels: []
    });
    expect(getChoicePresentation({ answerSubmitted: false, selected: false, isAiChoice: true })).toEqual({
      state: "idle",
      labels: []
    });
  });

  it("names a correct answer as both the player's choice and the AI image", () => {
    expect(getChoicePresentation({ answerSubmitted: true, selected: true, isAiChoice: true })).toEqual({
      state: "ai",
      labels: ["yourChoice", "aiChoice"]
    });
  });

  it("keeps an incorrect choice and the AI image distinct and explicitly labelled", () => {
    expect(getChoicePresentation({ answerSubmitted: true, selected: true, isAiChoice: false })).toEqual({
      state: "mistake",
      labels: ["yourChoice"]
    });
    expect(getChoicePresentation({ answerSubmitted: true, selected: false, isAiChoice: true })).toEqual({
      state: "ai",
      labels: ["aiChoice"]
    });
  });

  it("leaves an untouched non-AI card neutral and unlabelled", () => {
    expect(getChoicePresentation({ answerSubmitted: true, selected: false, isAiChoice: false })).toEqual({
      state: "neutral",
      labels: []
    });
  });
});

describe("tutorial interface messages", () => {
  const requiredKeys = [
    "missionChip",
    "introMeta",
    "start",
    "timeRemaining",
    "timeRemainingOne",
    "timeWarning",
    "timeExpired",
    "answerConfirmed",
    "yourChoice",
    "aiChoice",
    "stepCurrent",
    "stepCompleted",
    "completionTitle",
    "completionDescription",
    "replay"
  ];

  it("provides every briefing, answer-state and completion string in both languages", () => {
    for (const key of requiredKeys) {
      expect(hasNestedKey(spanishMessages.tutorial, key)).toBe(true);
      expect(hasNestedKey(englishMessages.tutorial, key)).toBe(true);
    }
  });

  it("uses singular, plural, warning, and expiry countdown copy in both languages", () => {
    expect(englishMessages.tutorial.timeRemaining).toBe("{seconds} seconds remaining");
    expect(englishMessages.tutorial.timeRemainingOne).toBe("1 second remaining");
    expect(englishMessages.tutorial.timeWarning).toBe("5 seconds remaining");
    expect(englishMessages.tutorial.timeExpired).toBe("Time is up");
    expect(spanishMessages.tutorial.timeRemaining).toBe("Quedan {seconds} segundos");
    expect(spanishMessages.tutorial.timeRemainingOne).toBe("Queda 1 segundo");
    expect(spanishMessages.tutorial.timeWarning).toBe("Quedan 5 segundos");
    expect(spanishMessages.tutorial.timeExpired).toBe("Se acabó el tiempo");
  });

  it("no longer exposes the removed duplicated lock and long-explanation strings", () => {
    for (const messages of [spanishMessages.tutorial, englishMessages.tutorial] as object[]) {
      expect(hasNestedKey(messages, "locked")).toBe(false);
      expect(hasNestedKey(messages, "takeaway")).toBe(false);
      expect(hasNestedKey(messages, "rounds.round1.explanation")).toBe(false);
      expect(hasNestedKey(messages, "rounds.round3.uncertainty")).toBe(false);
    }
  });
});
