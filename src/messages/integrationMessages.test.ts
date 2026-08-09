import { describe, expect, it } from "vitest";
import { islands } from "@/features/levels/levelModel";
import englishMessages from "./en.json";
import spanishMessages from "./es.json";

const obsoleteTutorialKeys = [
  "timeLimit",
  "introTitle",
  "introLead",
  "introHint",
  "nextMissionTitle",
  "nextMissionStatus",
  "returnToMissions"
] as const;

describe("final integration messages", () => {
  it("accurately describes device-only profile and progress storage", () => {
    expect(englishMessages.footer.notice).toBe("No account is required. Your profile and progress stay on this device.");
  });

  it("keeps Rank honestly marked as coming soon without rank tiers", () => {
    expect(englishMessages.home.hubSoon).toBe("Coming soon");
    expect("hubRanks" in englishMessages.home).toBe(false);
    expect("hubRanks" in spanishMessages.home).toBe(false);
  });

  it("uses the localized learning-goal names for the affected islands", () => {
    expect(spanishMessages.islands.list.training.title).toBe("Entrenamiento");
    expect(englishMessages.islands.list.training.title).toBe("Training");
    expect(spanishMessages.islands.list.difference.title).toBe("Caza de pistas");
    expect(englishMessages.islands.list.difference.title).toBe("Clue Hunt");
    expect(spanishMessages.islands.list.source.title).toBe("Comprobar la fuente");
    expect(englishMessages.islands.list.source.title).toBe("Check the Source");
    expect(spanishMessages.islands.list.videos.title).toBe("Cuadro a cuadro");
    expect(englishMessages.islands.list.videos.title).toBe("Frame by Frame");
    expect(spanishMessages.islands.list.difference.title).not.toBe("Diferenciar imágenes");
    expect(englishMessages.islands.list.difference.title).not.toBe("Telling images apart");
    expect(spanishMessages.islands.list.videos.title).not.toBe("Videos");
    expect(englishMessages.islands.list.videos.title).not.toBe("Videos");
  });

  it("keeps persisted island keys and routes stable while labels change", () => {
    expect(islands.map((island) => island.key)).toEqual(["training", "difference", "source", "videos"]);
  });

  it("does not retain the confirmed obsolete tutorial keys", () => {
    for (const key of obsoleteTutorialKeys) {
      expect(key in englishMessages.tutorial).toBe(false);
      expect(key in spanishMessages.tutorial).toBe(false);
    }
  });
});
