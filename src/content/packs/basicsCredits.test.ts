import { describe, expect, it } from "vitest";
import { getContentPack, getCreditedMedia } from "./packRegistry";

const publicDomainMark = "https://creativecommons.org/publicdomain/mark/1.0/";
const ccBy = "https://creativecommons.org/licenses/by/2.0/";
const ccBySa = "https://creativecommons.org/licenses/by-sa/2.0/";

describe("audited basics assets and credits", () => {
  it("uses the six current media pairs without the removed extensions", () => {
    const basics1 = getContentPack("introductory-tutorial-v1")!;
    const basics2 = getContentPack("city-basics-timed-v1")!;
    expect(basics1.rounds.flatMap((round) => round.choices.map((choice) => choice.media.src))).toEqual([
      "/media/tutorial/basics/basics-1/r1-monkey-camera.jpg", "/media/tutorial/basics/basics-1/r1-monkey-ai.png",
      "/media/tutorial/basics/basics-1/r2-earthquake-camera.jpg", "/media/tutorial/basics/basics-1/r2-earthquake-ai.png",
      "/media/tutorial/basics/basics-1/r3-cat-ai.png", "/media/tutorial/basics/basics-1/r3-cat-camera.png"
    ]);
    expect(basics2.rounds.flatMap((round) => round.choices.map((choice) => choice.media.src))).toEqual([
      "/media/tutorial/basics/basics-2/r1-real.jpg", "/media/tutorial/basics/basics-2/r1-ai.png",
      "/media/tutorial/basics/basics-2/r2-ai.png", "/media/tutorial/basics/basics-2/r2-real.jpg",
      "/media/tutorial/basics/basics-2/r3-real.jpg", "/media/tutorial/basics/basics-2/r3-ai.png"
    ]);
  });

  it("keeps the audited credit distinctions and their source and license links", () => {
    const credits = new Map(getCreditedMedia().map(({ media }) => [media.id, media.provenance.credit!]));
    expect(credits.size).toBeGreaterThanOrEqual(12);
    expect(credits.get("basics-1-r1-monkey-camera")).toMatchObject({ license: "Public Domain Mark 1.0", licenseUrl: publicDomainMark });
    expect(credits.get("basics-1-r3-cat-camera")).toMatchObject({ license: "CC0 1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/" });
    expect(credits.get("basics-1-r3-cat-camera")).toMatchObject({ title: "los sueños azules de un gato", creator: "Martín Vicente, M." });
    expect(credits.get("basics-1-r2-earthquake-camera")).toMatchObject({ license: "CC BY 2.0", licenseUrl: ccBy });
    expect(credits.get("basics-2-r1-pope-real")).toMatchObject({ license: "CC BY-SA 2.0", licenseUrl: ccBySa });
    for (const id of [...credits.keys()].filter((id) => id.endsWith("-ai"))) {
      expect(credits.get(id)).toEqual({ license: "project-generated", creationMethod: "ai-generated" });
    }

    expect({ license: "project-generated" }).not.toHaveProperty("creationMethod", "ai-generated");
  });
});
