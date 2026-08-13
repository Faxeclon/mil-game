import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { getContentPack, getSinglePack, reserveMediaProvenance } from "./packRegistry";

type MessageTree = Record<string, unknown>;

function messageAt(messages: MessageTree, key: string): unknown {
  return key.split(".").reduce<unknown>((value, part) => {
    return typeof value === "object" && value !== null ? (value as MessageTree)[part] : undefined;
  }, messages.tutorial);
}

function expectMedia(src: string, altKey: string) {
  expect(existsSync(join(process.cwd(), "public", src.slice(1))), src).toBe(true);
  expect(messageAt(spanishMessages as MessageTree, altKey), `es:${altKey}`).toEqual(expect.any(String));
  expect(messageAt(englishMessages as MessageTree, altKey), `en:${altKey}`).toEqual(expect.any(String));
}

describe("final media packs", () => {
  const comparisons = [
    ["city-basics-timed-v1", ["r1-real.jpg", "r1-ai.png", "r2-ai.png", "r2-real.jpg", "r3-real.jpg", "r3-ai.png"]],
    ["animals-compare-v1", ["r1-real.jpg", "r1-ai.jpg", "r2-ai.jpg", "r2-real.jpg", "r3-real.jpg", "r3-ai.jpg"]],
    ["animals-timed-v1", ["r1-real.jpg", "r1-ai.png", "r2-ai.png", "r2-real.jpg", "r3-real.jpg", "r3-ai.png"]],
    ["sports-compare-v1", ["r1-real.png", "r1-ai.png", "r2-ai.png", "r2-real.jpg", "r3-real.jpg", "r3-ai.png"]]
  ] as const;

  it("keeps each comparison level at three final-media rounds with exact asset paths", () => {
    for (const [packId, expectedFiles] of comparisons) {
      const pack = getContentPack(packId)!;
      expect(pack.rounds).toHaveLength(3);
      expect(pack.rounds.flatMap((round) => round.choices.map((choice) => choice.media.src.split("/").at(-1)))).toEqual(expectedFiles);
      for (const round of pack.rounds) {
        for (const choice of round.choices) expectMedia(choice.media.src, choice.media.altKey);
        expect(round.choices.find((choice) => choice.id === round.correctChoiceId)?.media.origin).toBe("ai-generated");
      }
    }
  });

  it("records transparent provenance for every active and reserve final asset", () => {
    const projectGenerated = new Set([
      "/media/tutorial/basics/basics-2/r1-ai.png",
      "/media/tutorial/basics/basics-2/r2-ai.png",
      "/media/tutorial/basics/basics-2/r3-ai.png",
      "/media/tutorial/animals/animals-2/r1-ai.png",
      "/media/tutorial/animals/animals-2/r2-ai.png",
      "/media/tutorial/animals/animals-2/r3-ai.png",
      "/media/tutorial/animals/animals-3/r2-ai.png",
      "/media/tutorial/sports/sports-1/r2-ai.png",
      "/media/tutorial/sports/sports-1/r3-ai.png"
    ]);
    const comparisonPacks = comparisons.map(([packId]) => getContentPack(packId)!);
    const singlePack = getSinglePack("animals-single-v1")!;
    const activeMedia = [
      ...comparisonPacks.flatMap((pack) => pack.rounds.flatMap((round) => round.choices.map((choice) => choice.media))),
      ...singlePack.rounds.map((round) => round.media)
    ];

    expect(activeMedia).toHaveLength(27);
    for (const media of activeMedia) {
      expect(media.provenance.sourceType).toBe(
        projectGenerated.has(media.src) ? "project-generated" : media.provenance.sourceType === "licensed" ? "licensed" : "external-unverified"
      );
      expect(media.provenance.temporary).toBe(false);
    }
    expect(reserveMediaProvenance).toEqual({
      "/media/tutorial/animals/animals-2/reserve/raccoon-ai.jpg": expect.objectContaining({
        sourceType: "project-generated",
        temporary: false
      }),
      "/media/tutorial/animals/animals-2/reserve/raccoon-real.jpg": expect.objectContaining({
        sourceType: "external-unverified",
        temporary: false
      })
    });
  });

  it("uses the approved subjects in their established order", () => {
    expect(getContentPack("city-basics-timed-v1")!.rounds.map((round) => round.choices.map((choice) => choice.media.id))).toEqual([
      ["basics-2-r1-pope-real", "basics-2-r1-pope-ai"],
      ["basics-2-r2-kangaroo-ai", "basics-2-r2-kangaroo-real"],
      ["basics-2-r3-ronaldo-real", "basics-2-r3-ronaldo-ai"]
    ]);
    expect(getContentPack("animals-compare-v1")!.rounds.map((round) => round.choices.map((choice) => choice.media.id))).toEqual([
      ["animals-1-r1-sheep-real", "animals-1-r1-sheep-ai"],
      ["animals-1-r2-squirrel-ai", "animals-1-r2-squirrel-real"],
      ["animals-1-r3-capybara-real", "animals-1-r3-capybara-ai"]
    ]);
    expect(getContentPack("animals-timed-v1")!.rounds.map((round) => round.choices.map((choice) => choice.media.id))).toEqual([
      ["animals-2-r1-dog-real", "animals-2-r1-dog-ai"],
      ["animals-2-r2-horse-ai", "animals-2-r2-horse-real"],
      ["animals-2-r3-cat-real", "animals-2-r3-cat-ai"]
    ]);
    expect(getContentPack("sports-compare-v1")!.rounds.map((round) => round.choices.map((choice) => choice.media.id))).toEqual([
      ["sports-1-r1-messi-real", "sports-1-r1-messi-ai"],
      ["sports-1-r2-mrbeast-ai", "sports-1-r2-lebron-real"],
      ["sports-1-r3-football-real", "sports-1-r3-football-ai"]
    ]);
  });

  it("keeps animals-3 single-image answers and excludes the reserve raccoon pair", () => {
    const pack = getSinglePack("animals-single-v1")!;
    expect(pack.rounds.map((round) => [round.media.id, round.answer])).toEqual([
      ["animals-3-r1-shoebill-real", "camera-captured"],
      ["animals-3-r2-golden-pheasant-ai", "ai-generated"],
      ["animals-3-r3-goats-real", "camera-captured"]
    ]);
    for (const round of pack.rounds) expectMedia(round.media.src, round.media.altKey);
    expect(JSON.stringify(pack)).not.toContain("raccoon");
    expect(existsSync(join(process.cwd(), "public/media/tutorial/animals/animals-2/reserve/raccoon-real.jpg"))).toBe(true);
    expect(existsSync(join(process.cwd(), "public/media/tutorial/animals/animals-2/reserve/raccoon-ai.jpg"))).toBe(true);
  });
});
