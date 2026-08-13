import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { islands } from "@/features/levels/levelModel";
import { authoredIslandStories, getIslandStoryScenes } from "./islandStory";

const locales = [
  { locale: "en", messages: englishMessages },
  { locale: "es", messages: spanishMessages }
] as const;

describe("the story an island can tell on arrival", () => {
  it("has every beat written in both languages before any of it can be played", () => {
    /*
     * The scenes are declared while their artwork is still being drawn, so this runs
     * against what is authored rather than against what is switched on. A missing line
     * would otherwise surface as a raw message key on screen the day the art lands.
     */
    for (const [islandKey, scenes] of Object.entries(authoredIslandStories)) {
      for (const { locale, messages } of locales) {
        const t = createTranslator({ locale, messages, namespace: "islandStory" });

        for (const scene of scenes ?? []) {
          for (const beat of scene.beats) {
            const line = t(`${islandKey}.${beat}` as "decisions.decisions1");
            expect(line, `${locale}.${islandKey}.${beat}`).toEqual(expect.any(String));
            expect(line.trim().length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("points every scene at its own picture, so none can quietly reuse another's", () => {
    for (const scenes of Object.values(authoredIslandStories)) {
      const images = (scenes ?? []).map((scene) => scene.image);

      expect(images.length).toBeGreaterThan(0);
      expect(new Set(images).size).toBe(images.length);
      for (const image of images) expect(image.startsWith("/assets/story/")).toBe(true);
    }
  });

  it("leaves every other island with its one-line arrival", () => {
    // A cinematic before each of the four would be four interruptions on the way to play.
    const withStories = islands.filter((island) => getIslandStoryScenes(island.key).length > 0);

    expect(withStories.length).toBeLessThanOrEqual(1);
  });

  it("plays nothing while the artwork is still missing", () => {
    /*
     * The deciding island is authored but switched off until its four files exist. Text
     * over a broken image is worse than the line it replaced, and that is the kind of
     * thing discovered in front of a jury rather than in a test.
     */
    expect(getIslandStoryScenes("decisions")).toEqual([]);
    expect(authoredIslandStories.decisions?.length).toBe(4);
  });
});
