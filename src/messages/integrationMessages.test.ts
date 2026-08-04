import { describe, expect, it } from "vitest";
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
    expect(spanishMessages.footer.notice).toBe("No necesitas una cuenta. Tu perfil y tu progreso se guardan en este dispositivo.");
  });

  it("keeps Rank honestly marked as coming soon without rank tiers", () => {
    expect(englishMessages.home.hubSoon).toBe("Coming soon");
    expect(spanishMessages.home.hubSoon).toBe("Próximamente");
    expect("hubRanks" in englishMessages.home).toBe(false);
    expect("hubRanks" in spanishMessages.home).toBe(false);
  });

  it("uses corrected Spanish accents in the affected island and tutorial copy", () => {
    expect(spanishMessages.tutorial.entering).toBe("Estás entrando a");
    expect(spanishMessages.worlds.mascotAlt).toBe("Roqui, tu guía en el mapa.");
    expect(spanishMessages.islands.missionNumber).toBe("Misión {number}");
    expect(spanishMessages.islands.comingSoon).toBe("Próximamente");
    expect(spanishMessages.islands.difficulty).toEqual({ easy: "Fácil", medium: "Medio", hard: "Difícil" });
    expect(spanishMessages.islands.list.training.description).toContain("atención");
    expect(spanishMessages.islands.list.difference.title).toContain("imágenes");
    expect(spanishMessages.islands.list.source.description).toContain("quién comparte algo y por qué");
  });

  it("does not retain the confirmed obsolete tutorial keys", () => {
    for (const key of obsoleteTutorialKeys) {
      expect(key in englishMessages.tutorial).toBe(false);
      expect(key in spanishMessages.tutorial).toBe(false);
    }
  });
});
