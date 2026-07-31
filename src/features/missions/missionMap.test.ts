import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { getDefaultMissionKey, getMissionActionHref, getMissionByKey, missionBlueprint } from "./missionMap";

describe("mission map data", () => {
  it("keeps all six missions and selects Initial Training by default", () => {
    expect(missionBlueprint).toHaveLength(6);
    expect(getDefaultMissionKey()).toBe("training");
    expect(getMissionByKey("training")).toMatchObject({ key: "training", state: "available" });
  });

  it("exposes exactly one playable tutorial action and no locked mission links", () => {
    const actionHrefs = missionBlueprint.map(getMissionActionHref).filter(Boolean);
    expect(actionHrefs).toEqual(["/tutorial"]);
    expect(missionBlueprint.filter((mission) => mission.state === "locked").every((mission) => getMissionActionHref(mission) === null)).toBe(true);
  });

  it("resolves every mission title and description in Spanish and English", () => {
    for (const mission of missionBlueprint) {
      expect(englishMessages.worlds.missions[mission.key].title).toEqual(expect.any(String));
      expect(englishMessages.worlds.missions[mission.key].description).toEqual(expect.any(String));
      expect(spanishMessages.worlds.missions[mission.key].title).toEqual(expect.any(String));
      expect(spanishMessages.worlds.missions[mission.key].description).toEqual(expect.any(String));
    }
  });

  it("formats an accessible node label for every mission in both languages", () => {
    const locales = [
      { locale: "en", messages: englishMessages },
      { locale: "es", messages: spanishMessages }
    ] as const;

    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "worlds" });
      for (const [index, mission] of missionBlueprint.entries()) {
        const title = t(`missions.${mission.key}.title`);
        const status = t(mission.state === "available" ? "available" : "comingSoon");
        expect(() => t("nodeAria", { number: index + 1, title, status })).not.toThrow();
        expect(t("nodeAria", { number: index + 1, title, status })).not.toMatch(/\{number\}|\{title\}|\{status\}/);
      }
    }
  });
});
