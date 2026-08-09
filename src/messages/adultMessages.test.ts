import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";

const LOCALES = { es, en } as const;

describe.each(Object.entries(LOCALES))("%s adult metrics", (_locale, messages) => {
  const adult = messages.adult as unknown as Record<string, string>;

  it("labels only the locally recorded time in missions", () => {
    expect(adult.timeInMissions).toBeTruthy();
    expect(adult.timeInMissionsHours).toBeTruthy();
    expect(adult.timePlayed).toBeUndefined();
    expect(adult.timePlayedHours).toBeUndefined();
  });

  it("labels the stored completion event without claiming general activity", () => {
    expect(adult.lastMissionCompleted).toBeTruthy();
    expect(adult.noActivityRecorded).toBeTruthy();
    expect(adult.lastPlayed).toBeUndefined();
    expect(adult.lastPlayedNever).toBeUndefined();
  });
});

describe("adult metric copy", () => {
  it("keeps the Spanish labels precise", () => {
    expect(es.adult.timeInMissions).toContain("Tiempo en misiones");
    expect(es.adult.lastMissionCompleted).toContain("Última misión completada");
    expect(es.adult.noActivityRecorded).toBe("Aún no hay actividad registrada.");
  });

  it("keeps the English labels precise", () => {
    expect(en.adult.timeInMissions).toContain("Time in missions");
    expect(en.adult.lastMissionCompleted).toContain("Last mission completed");
    expect(en.adult.noActivityRecorded).toBe("No activity recorded yet.");
  });
});
