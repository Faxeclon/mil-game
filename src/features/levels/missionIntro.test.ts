import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { initialProgressState, type ProgressState } from "@/features/progress/progressState";
import { categories, islands, type LevelId } from "./levelModel";
import { getMissionIntro } from "./missionIntro";
import { playableMissionOrder } from "./progressSummary";

function withCompleted(...levelIds: LevelId[]): ProgressState {
  return { ...initialProgressState, completedLevelIds: levelIds };
}

describe("when Roqui presents a place", () => {
  it("announces the island at its very first mission", () => {
    expect(getMissionIntro(initialProgressState, "basics-1")).toEqual({
      kind: "island",
      islandKey: "training",
      categoryKey: "basics"
    });
  });

  it("announces the new island when the player crosses into it", () => {
    expect(getMissionIntro(withCompleted("basics-1", "basics-2"), "animals-1")).toEqual({
      kind: "island",
      islandKey: "difference",
      categoryKey: "animals"
    });
  });

  it("announces the theme when it changes inside the same island", () => {
    expect(getMissionIntro(initialProgressState, "sports-1")).toEqual({
      kind: "category",
      categoryKey: "sports"
    });
  });

  it("says nothing in the middle of a theme", () => {
    expect(getMissionIntro(initialProgressState, "basics-2")).toBeNull();
    expect(getMissionIntro(initialProgressState, "animals-2")).toBeNull();
    expect(getMissionIntro(initialProgressState, "animals-3")).toBeNull();
  });

  it("says nothing on a replay, because a replay is not an arrival", () => {
    expect(getMissionIntro(withCompleted("animals-1"), "animals-1")).toBeNull();
  });

  it("says nothing for a mission that does not exist or has no content", () => {
    expect(getMissionIntro(initialProgressState, "ghost-level")).toBeNull();
  });

  it("greets every island and every theme exactly once along the way", () => {
    const islandGreetings = new Set<string>();
    const categoryGreetings = new Set<string>();
    let state = initialProgressState;

    for (const mission of playableMissionOrder) {
      const intro = getMissionIntro(state, mission.id);
      if (intro?.kind === "island") islandGreetings.add(intro.islandKey);
      if (intro?.kind === "category") categoryGreetings.add(intro.categoryKey);
      state = { ...state, completedLevelIds: [...state.completedLevelIds, mission.id as LevelId] };
    }

    // Every island with content is announced, and every later theme inside one. The first
    // theme of an island is not greeted twice: arriving at the island already said it.
    expect(islandGreetings).toEqual(new Set(["training", "difference", "source", "videos"]));
    expect(categoryGreetings).toEqual(new Set(["sports", "memes"]));
  });
});

describe("what Roqui says", () => {
  const locales = [
    { locale: "en", messages: englishMessages },
    { locale: "es", messages: spanishMessages }
  ] as const;

  it("has an arrival line for every island, in both languages", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "islands" });

      for (const island of islands) {
        const line = t(`list.${island.key}.intro`);
        expect(line, `${locale}.${island.key}`).toEqual(expect.any(String));
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("has an arrival line for every theme, in both languages", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "islands" });

      for (const category of categories) {
        const line = t(`categories.${category.key}.intro`);
        expect(line, `${locale}.${category.key}`).toEqual(expect.any(String));
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
