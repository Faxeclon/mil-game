import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { missionBlueprint } from "@/features/levels/levelModel";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { getContentPack, getSinglePack } from "./packRegistry";

type MessageTree = Record<string, unknown>;

function messageAt(messages: MessageTree, key: string): unknown {
  return key.split(".").reduce<unknown>((value, part) => {
    return typeof value === "object" && value !== null ? (value as MessageTree)[part] : undefined;
  }, messages.tutorial);
}

function activeVisualMedia() {
  return missionBlueprint.flatMap((mission) => {
    const comparisonPack = getContentPack(mission.packId);
    if (comparisonPack) return comparisonPack.rounds.flatMap((round) => round.choices.map((choice) => choice.media));

    const singlePack = getSinglePack(mission.packId);
    return singlePack ? singlePack.rounds.map((round) => round.media) : [];
  });
}

describe("active visual media accessibility", () => {
  it("uses existing active assets with localized, origin-neutral alternative text", () => {
    const media = activeVisualMedia();
    expect(media).not.toHaveLength(0);

    for (const item of media) {
      expect(existsSync(join(process.cwd(), "public", item.src.slice(1))), item.src).toBe(true);
      expect(item.src).toMatch(/^\/media\/tutorial\/(basics|animals|sports|videos)\//);
      expect(item.src, `${item.altKey} must not use a retired placeholder`).not.toContain("/placeholders/");

      for (const [locale, messages] of Object.entries({ es: spanishMessages, en: englishMessages })) {
        const alt = messageAt(messages as MessageTree, item.altKey);
        expect(alt, `${locale}:${item.altKey}`).toEqual(expect.any(String));
        expect((alt as string).trim(), `${locale}:${item.altKey}`).not.toHaveLength(0);
        expect(alt, `${locale}:${item.altKey}`).not.toMatch(/generated with ai|generado con ia|camera-captured|real image/i);
      }
    }
  });

  it("keeps descriptions aligned with the assets that replaced the old Sports 2 placeholders", () => {
    const spanish = spanishMessages.tutorial.media.sports;
    const english = englishMessages.tutorial.media.sports;

    expect(spanish.skatePark).toBe("Un corredor cruza la meta en una pista.");
    expect(english.skatePark).toBe("A runner crosses the finish line on a track.");
    expect(spanish.tennisCourt).toBe("Una persona hace un truco con patineta.");
    expect(english.tennisCourt).toBe("A person performs a skateboard trick.");
    expect(spanish.boxingRing).toBe("Una persona juega ajedrez bajo el agua.");
    expect(english.boxingRing).toBe("A person plays chess underwater.");
  });

  it("does not retain the retired tutorial placeholder assets", () => {
    expect(existsSync(join(process.cwd(), "public", "media", "tutorial", "placeholders"))).toBe(false);
  });
});
