import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { creditedPackPresentationKeys, getContentPack, getCreditedMedia } from "./packRegistry";

describe("audited Sports 1 assets and credits", () => {
  it("uses the six supplied files without changing round IDs, order, or answers", () => {
    const pack = getContentPack("sports-compare-v1")!;
    expect(pack.rounds.flatMap((round) => round.choices.map((choice) => choice.media.src))).toEqual([
      "/media/tutorial/sports/sports-1/r1-real.jpg", "/media/tutorial/sports/sports-1/r1-ai.png",
      "/media/tutorial/sports/sports-1/r2-ai.png", "/media/tutorial/sports/sports-1/r2-real.jpg",
      "/media/tutorial/sports/sports-1/r3-real.jpg", "/media/tutorial/sports/sports-1/r3-ai.png"
    ]);
    expect(pack.rounds.map((round) => round.correctChoiceId)).toEqual([
      "sports-compare-1-right",
      "sports-compare-2-left",
      "sports-compare-3-right"
    ]);
    for (const media of pack.rounds.flatMap((round) => round.choices.map((choice) => choice.media))) {
      expect(existsSync(join(process.cwd(), "public", media.src.slice(1))), media.src).toBe(true);
    }
  });

  it("records each source, license, and explicit project AI creation method", () => {
    const credits = new Map(
      getCreditedMedia()
        .filter(({ packId }) => packId === "sports-compare-v1")
        .map(({ media }) => [media.id, media.provenance.credit!])
    );
    expect(credits.size).toBe(6);
    expect(credits.get("sports-1-r1-messi-real")).toMatchObject({
      title: "Lionel Messi playing for Argentina at the 2022 FIFA World Cup",
      creator: "Hossein Zohrevand",
      attributionText: "Tasnim News Agency",
      license: "CC BY 4.0"
    });
    expect(credits.get("sports-1-r2-lebron-real")).toMatchObject({ creator: "Erik Drost", license: "CC BY 2.0" });
    expect(credits.get("sports-1-r3-football-real")).toMatchObject({ creator: "Addesolen", license: "CC0 1.0" });
    for (const id of ["sports-1-r1-messi-ai", "sports-1-r2-mrbeast-ai", "sports-1-r3-football-ai"]) {
      expect(credits.get(id)).toEqual({ license: "project-generated", creationMethod: "ai-generated" });
    }
  });

  it("uses a localized presentation label rather than exposing the technical pack ID", () => {
    expect(creditedPackPresentationKeys["sports-compare-v1"]).toBe("sports1");
    expect(spanishMessages.credits.packs.sports1).toBe("Deportes · Misión 1");
    expect(englishMessages.credits.packs.sports1).toBe("Sports · Mission 1");
  });
});
