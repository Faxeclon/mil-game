export type IntroStoryLocale = "es" | "en";

export type IntroStoryScene = {
  id: "scene-01" | "scene-02" | "scene-03" | "scene-04" | "scene-05";
  beats: readonly string[];
  image: string;
};

type IntroStoryDefinition = Omit<IntroStoryScene, "image"> & {
  image: string | Record<IntroStoryLocale, string>;
};

const introStoryDefinitions: readonly IntroStoryDefinition[] = [
  { id: "scene-01", image: "/assets/story/intro/scene-01.png", beats: ["scene1"] },
  { id: "scene-02", image: { es: "/assets/story/intro/scene-02-es.png", en: "/assets/story/intro/scene-02-en.png" }, beats: ["scene2"] },
  { id: "scene-03", image: { es: "/assets/story/intro/scene-03-es.png", en: "/assets/story/intro/scene-03-en.png" }, beats: ["scene3"] },
  { id: "scene-04", image: { es: "/assets/story/intro/scene-04-es.png", en: "/assets/story/intro/scene-04-en.png" }, beats: ["scene4"] },
  { id: "scene-05", image: { es: "/assets/story/intro/scene-05-es.png", en: "/assets/story/intro/scene-05-en.png" }, beats: ["scene5Question", "scene5Ask"] }
];

/** Resolves the localized artwork without duplicating the story component by locale. */
export function getIntroStoryScenes(locale: IntroStoryLocale): readonly IntroStoryScene[] {
  return introStoryDefinitions.map((scene) => ({
    id: scene.id,
    beats: scene.beats,
    image: typeof scene.image === "string" ? scene.image : scene.image[locale]
  }));
}
