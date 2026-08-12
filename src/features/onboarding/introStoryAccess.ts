/** The map cannot decide whether to show the prologue before local progress is known. */
export type IntroStoryAccess = "checking" | "story" | "map";

export function getIntroStoryAccess(hydrated: boolean, introStorySeen: boolean): IntroStoryAccess {
  if (!hydrated) return "checking";
  return introStorySeen ? "map" : "story";
}
