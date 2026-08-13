import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { creditedPackPresentationKeys, getContentPack, getCreditedMedia, getSinglePack } from "./packRegistry";

const animalPackIds = ["animals-compare-v1", "animals-timed-v1", "animals-single-v1"] as const;
const animalAiIds = new Set([
  "animals-1-r1-sheep-ai",
  "animals-1-r2-squirrel-ai",
  "animals-1-r3-capybara-ai",
  "animals-2-r1-dog-ai",
  "animals-2-r2-horse-ai",
  "animals-2-r3-cat-ai",
  "animals-3-r2-golden-pheasant-ai"
]);

describe("audited Animals assets and credits", () => {
  it("uses the refreshed Animals 1 paths and keeps all active Animals media on disk", () => {
    const animals1 = getContentPack("animals-compare-v1")!;
    expect(animals1.rounds.flatMap((round) => round.choices.map((choice) => choice.media.src))).toEqual([
      "/media/tutorial/animals/animals-1/r1-real.jpg", "/media/tutorial/animals/animals-1/r1-ai.png",
      "/media/tutorial/animals/animals-1/r2-ai.png", "/media/tutorial/animals/animals-1/r2-real.jpg",
      "/media/tutorial/animals/animals-1/r3-real.jpg", "/media/tutorial/animals/animals-1/r3-ai.png"
    ]);

    const activeSources = [
      ...animals1.rounds.flatMap((round) => round.choices.map((choice) => choice.media.src)),
      ...getContentPack("animals-timed-v1")!.rounds.flatMap((round) => round.choices.map((choice) => choice.media.src)),
      ...getSinglePack("animals-single-v1")!.rounds.map((round) => round.media.src)
    ];
    expect(activeSources).toHaveLength(15);
    for (const source of activeSources) {
      expect(existsSync(join(process.cwd(), "public", source.slice(1))), source).toBe(true);
    }
  });

  it("exposes credits for all and only the 15 active Animals assets", () => {
    const creditedAnimals = getCreditedMedia().filter(({ packId }) => animalPackIds.includes(packId as (typeof animalPackIds)[number]));
    expect(creditedAnimals).toHaveLength(15);
    expect(new Set(creditedAnimals.map(({ media }) => media.id)).size).toBe(15);
    for (const { media } of creditedAnimals) {
      expect(media.provenance.temporary).toBe(false);
      expect(media.provenance.credit).toBeDefined();
    }
  });

  it("distinguishes audited external licenses from Kikiria AI generation explicitly", () => {
    const credits = new Map(getCreditedMedia().map(({ media }) => [media.id, media.provenance.credit!]));
    expect(credits.get("animals-2-r2-horse-real")).toMatchObject({ creator: "Beersrobert000", license: "CC0 1.0" });
    expect(credits.get("animals-1-r1-sheep-real")).toMatchObject({ creator: "Amanda Slater", license: "CC BY-SA 2.0" });
    expect(credits.get("animals-3-r1-shoebill-real")).toMatchObject({ creator: "Bob Owen", license: "CC BY 2.0" });
    expect(credits.get("animals-1-r3-capybara-real")).toMatchObject({ creator: "Charles J. Sharp", license: "CC BY-SA 4.0" });

    for (const id of animalAiIds) {
      expect(credits.get(id)).toEqual({ license: "project-generated", creationMethod: "ai-generated" });
    }
  });

  it("uses localized, non-technical presentation labels for all three Animals missions", () => {
    expect(creditedPackPresentationKeys).toMatchObject({
      "animals-compare-v1": "animals1",
      "animals-timed-v1": "animals2",
      "animals-single-v1": "animals3"
    });
    expect(spanishMessages.credits.packs).toMatchObject({
      animals1: "Animales · Misión 1",
      animals2: "Animales · Misión 2",
      animals3: "Animales · Misión 3"
    });
    expect(englishMessages.credits.packs).toMatchObject({
      animals1: "Animals · Mission 1",
      animals2: "Animals · Mission 2",
      animals3: "Animals · Mission 3"
    });
  });
});
