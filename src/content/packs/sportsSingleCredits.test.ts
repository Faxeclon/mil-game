import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { creditedPackPresentationKeys, getCreditedMedia, getSinglePack } from "./packRegistry";

describe("audited Sports 2 assets and credits", () => {
  it("uses the three supplied single-image assets with matching final answers and origin", () => {
    const pack = getSinglePack("sports-single-v1")!;
    expect(pack.rounds.map((round) => round.media.src)).toEqual([
      "/media/tutorial/sports/sports-2/r1-real.jpg",
      "/media/tutorial/sports/sports-2/r2-ai.png",
      "/media/tutorial/sports/sports-2/r3-real.jpg"
    ]);
    expect(pack.rounds.map((round) => [round.id, round.answer])).toEqual([
      ["sports-single-round-1", "camera-captured"],
      ["sports-single-round-2", "ai-generated"],
      ["sports-single-round-3", "camera-captured"]
    ]);
    expect(pack.rounds.map((round) => round.media.origin)).toEqual(pack.rounds.map((round) => round.answer));
    for (const round of pack.rounds) {
      expect(existsSync(join(process.cwd(), "public", round.media.src.slice(1))), round.media.src).toBe(true);
    }
  });

  it("records the two external credits and explicit project AI creation method", () => {
    const credits = new Map(
      getCreditedMedia().filter(({ packId }) => packId === "sports-single-v1").map(({ media }) => [media.id, media.provenance.credit!])
    );
    expect(credits.size).toBe(3);
    expect(credits.get("sports-single-skate-park")).toMatchObject({
      creator: "Seattle Parks & Recreation",
      license: "CC BY 2.0"
    });
    expect(credits.get("sports-single-tennis-court")).toEqual({ license: "project-generated", creationMethod: "ai-generated" });
    expect(credits.get("sports-single-boxing-ring")).toMatchObject({ creator: "Etan Ilfeld", license: "CC BY-SA 4.0" });
  });

  it("uses a localized Sports 2 title rather than its technical pack ID", () => {
    expect(creditedPackPresentationKeys["sports-single-v1"]).toBe("sports2");
    expect(spanishMessages.credits.packs.sports2).toBe("Deportes · Misión 2");
    expect(englishMessages.credits.packs.sports2).toBe("Sports · Mission 2");
  });
});
