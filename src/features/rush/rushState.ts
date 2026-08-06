import type { SinglePack, TutorialPack } from "@/content/schemas/tutorial";
import type { IslandKey } from "@/features/levels/levelModel";
import { getPlayableCategories, getPlayableMissions } from "@/features/levels/levelProgress";

/**
 * Thirty seconds, one image at a time.
 *
 * This is the arcade corner of the game and it is deliberately kept away from the map:
 * it awards no medals, changes no progress and unlocks nothing. Speed is fun, but the
 * missions are where the lesson lives, and mixing the two would teach a child to hurry.
 *
 * Nothing is stored. A run is a moment, like the versus matches.
 */
export type RushItem = {
  id: string;
  src: string;
  altKey: string;
  /** The honest answer for this image. */
  isAi: boolean;
};

export const RUSH_SECONDS = 30;

export type RushState =
  | { status: "lobby" }
  | {
      status: "playing";
      index: number;
      correct: number;
      wrong: number;
      /** What the last answer was, so the card can flash without pausing the clock. */
      lastAnswer: "right" | "wrong" | null;
    }
  | { status: "finished"; correct: number; wrong: number; ranOut: boolean };

export type RushAction =
  | { type: "start" }
  | { type: "answer"; saidAi: boolean; item: RushItem; total: number }
  | { type: "timeUp" }
  | { type: "restart" };

export const initialRushState: RushState = { status: "lobby" };

export function rushReducer(state: RushState, action: RushAction): RushState {
  if (action.type === "restart") return initialRushState;
  if (action.type === "start") {
    return state.status === "lobby" ? { status: "playing", index: 0, correct: 0, wrong: 0, lastAnswer: null } : state;
  }
  if (state.status !== "playing") return state;

  if (action.type === "timeUp") {
    return { status: "finished", correct: state.correct, wrong: state.wrong, ranOut: true };
  }

  const right = action.saidAi === action.item.isAi;
  const correct = state.correct + (right ? 1 : 0);
  const wrong = state.wrong + (right ? 0 : 1);
  const nextIndex = state.index + 1;

  // Running out of images ends the run early rather than looping the same ones round.
  if (nextIndex >= action.total) return { status: "finished", correct, wrong, ranOut: false };
  return { status: "playing", index: nextIndex, correct, wrong, lastAnswer: right ? "right" : "wrong" };
}

/**
 * Every authored image, as something that can be judged on its own.
 *
 * Both pack shapes contribute: a comparison round holds two pictures, and each of them
 * has a recorded origin, so it can stand alone here without any new artwork.
 */
export function buildRushPool(
  comparePacks: readonly TutorialPack[],
  singlePacks: readonly SinglePack[]
): RushItem[] {
  const items: RushItem[] = [];
  const seen = new Set<string>();

  const push = (id: string, src: string, altKey: string, isAi: boolean) => {
    if (seen.has(src)) return;
    seen.add(src);
    items.push({ id, src, altKey, isAi });
  };

  for (const pack of comparePacks) {
    for (const round of pack.rounds) {
      for (const choice of round.choices) {
        push(choice.media.id, choice.media.src, choice.media.altKey, choice.media.origin === "ai-generated");
      }
    }
  }
  for (const pack of singlePacks) {
    for (const round of pack.rounds) {
      push(round.media.id, round.media.src, round.media.altKey, round.answer === "ai-generated");
    }
  }

  return items;
}

/**
 * The images of one island, so its challenge is made of what was learned there.
 *
 * A run that mixed every island together would be a separate game sitting beside the map.
 * Scoped to an island it becomes the last thing you do there: the same pictures, now
 * without time to think, which is a different question about the same material.
 */
export function buildIslandRushPool(
  island: IslandKey,
  comparePacks: Readonly<Record<string, TutorialPack>>,
  singlePacks: Readonly<Record<string, SinglePack>>
): RushItem[] {
  const packIds = getPlayableCategories(island)
    .flatMap((category) => getPlayableMissions(category.key))
    .map((mission) => mission.packId)
    .filter((packId): packId is string => Boolean(packId));

  return buildRushPool(
    packIds.map((packId) => comparePacks[packId]).filter(Boolean),
    packIds.map((packId) => singlePacks[packId]).filter(Boolean)
  );
}

/** Shuffles the pool for one run, without repeating an image inside it. */
export function dealRush(pool: readonly RushItem[], random: () => number = Math.random): RushItem[] {
  const remaining = [...pool];
  const deck: RushItem[] = [];

  while (remaining.length > 0) {
    const draw = random();
    const safeDraw = Number.isFinite(draw) ? Math.min(Math.max(draw, 0), 0.999_999) : 0;
    deck.push(...remaining.splice(Math.floor(safeDraw * remaining.length), 1));
  }
  return deck;
}

/** What the run says about the player, without turning it into a grade. */
export function getRushAccuracy(correct: number, wrong: number): number {
  const answered = correct + wrong;
  return answered === 0 ? 0 : Math.round((correct / answered) * 100);
}
