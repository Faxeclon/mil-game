import { describe, expect, it } from "vitest";
import { getIntroStoryScenes } from "./introStory";

describe("intro story scene assets", () => {
  it("keeps the first scene shared and chooses the remaining artwork by locale", () => {
    const spanish = getIntroStoryScenes("es");
    const english = getIntroStoryScenes("en");

    expect(spanish).toHaveLength(5);
    expect(spanish[0]?.image).toBe("/assets/story/intro/scene-01.png");
    expect(english[0]?.image).toBe("/assets/story/intro/scene-01.png");
    expect(spanish.slice(1).map((scene) => scene.image)).toEqual([
      "/assets/story/intro/scene-02-es.png",
      "/assets/story/intro/scene-03-es.png",
      "/assets/story/intro/scene-04-es.png",
      "/assets/story/intro/scene-05-es.png"
    ]);
    expect(english.slice(1).map((scene) => scene.image)).toEqual([
      "/assets/story/intro/scene-02-en.png",
      "/assets/story/intro/scene-03-en.png",
      "/assets/story/intro/scene-04-en.png",
      "/assets/story/intro/scene-05-en.png"
    ]);
    expect(spanish.at(-1)?.beats).toEqual(["scene5Question", "scene5Ask"]);
  });
});
