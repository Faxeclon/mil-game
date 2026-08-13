import type { IslandKey } from "@/features/levels/levelModel";

/**
 * A story told on arrival at an island, in the shape the game's opening already uses.
 *
 * The opening story earns its place because the game has to explain itself once. An island
 * does not - which is why only one island has scenes here, and why the rest keep the single
 * line Roqui says on the way in. A cinematic before every island would be five interruptions
 * on the way to a game a child opened to play.
 *
 * The exception is the deciding island. It is the only one that changes what the game is
 * asking: everything before it says "look at this and tell me what it is", and this one says
 * "you already know what it is - now what are you going to do?". That turn deserves to be
 * told rather than announced.
 *
 * Unlike the opening, the artwork here carries no text. The beats are drawn over the image
 * by the component, so one file serves both languages and the words can be fixed by editing
 * a message rather than by redrawing a picture.
 */
export type IslandStoryScene = {
  id: string;
  /** Message keys under `islandStory.<island>`, shown one after another over the image. */
  beats: readonly string[];
  image: string;
};

/*
 * Flipped on when the four files below exist under `public/assets/story/decisions/`.
 *
 * Until then the island keeps its one-line arrival, which is a complete experience and not
 * a placeholder. A story that half-loads - text over a broken image - would be worse than
 * the line it replaced, and this is the kind of thing that is discovered in front of a
 * jury rather than in a test.
 */
const decisionsArtReady = false;

const decisionsScenes: readonly IslandStoryScene[] = [
  { id: "decisions-01", beats: ["decisions1"], image: "/assets/story/decisions/scene-01.png" },
  { id: "decisions-02", beats: ["decisions2"], image: "/assets/story/decisions/scene-02.png" },
  { id: "decisions-03", beats: ["decisions3"], image: "/assets/story/decisions/scene-03.png" },
  { id: "decisions-04", beats: ["decisions4", "decisions4Ask"], image: "/assets/story/decisions/scene-04.png" }
];

const storiesByIsland: Partial<Record<IslandKey, readonly IslandStoryScene[]>> = {
  decisions: decisionsScenes
};

/** The scenes to play on arrival at an island, or none when it simply announces itself. */
export function getIslandStoryScenes(island: IslandKey): readonly IslandStoryScene[] {
  if (island === "decisions" && !decisionsArtReady) return [];
  return storiesByIsland[island] ?? [];
}

/** Every scene the game could play, art present or not, for content checks. */
export const authoredIslandStories = storiesByIsland;
