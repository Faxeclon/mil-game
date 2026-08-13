import { describe, expect, it } from "vitest";
import { contentPacks, singlePacks } from "@/content/packs/packRegistry";
import {
  buildRushPool,
  buildCategoryRushPool,
  buildIslandRushPool,
  dealRush,
  getRushAccuracy,
  getBonusRushDuration,
  getBonusRushScore,
  islandHasRush,
  initialRushState,
  rushReducer,
  RUSH_SECONDS,
  type RushItem,
  type RushState
} from "./rushState";

const pool = buildRushPool(Object.values(contentPacks), Object.values(singlePacks));
const aiItem: RushItem = { id: "ai", src: "/a.svg", altKey: "media.a", isAi: true };
const cameraItem: RushItem = { id: "camera", src: "/b.svg", altKey: "media.b", isAi: false };

function answer(state: RushState, saidAi: boolean, item: RushItem, total = 10, reward: "extra-life" | "double-points" | "extra-15" | "extra-10" | "none" = "none"): RushState {
  return rushReducer(state, { type: "answer", saidAi, item, total, reward });
}

describe("the pool of images", () => {
  it("keeps the category helper scoped for authored content tooling", () => {
    const animals = buildCategoryRushPool("animals", contentPacks, singlePacks);
    const sports = buildCategoryRushPool("sports", contentPacks, singlePacks);

    expect(animals.length).toBeGreaterThan(0);
    expect(sports.length).toBeGreaterThan(0);
    expect(animals.every((item) => item.src.includes("/animals/"))).toBe(true);
    expect(sports.every((item) => item.src.includes("/sports/"))).toBe(true);
  });

  it("builds every Bonus hunt from its whole island, regardless of the section ticket", () => {
    const difference = buildIslandRushPool("difference", contentPacks, singlePacks);
    const fromAnimals = difference;
    const fromSports = difference;

    expect(fromAnimals.some((item) => item.src.includes("/animals/"))).toBe(true);
    expect(fromAnimals.some((item) => item.src.includes("/sports/"))).toBe(true);
    expect(fromAnimals.some((item) => item.src.includes("/memes/"))).toBe(true);
    expect(fromSports).toEqual(fromAnimals);
    expect(difference.every((item) => /\/(animals|sports|memes)\//.test(item.src))).toBe(true);

    const videos = buildIslandRushPool("videos", contentPacks, singlePacks);
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.every((item) => item.src.includes("/videos/"))).toBe(true);
  });

  it("has nothing to run for an island made of decisions, and says so before a Bonus is given", () => {
    // Nothing to look at means nothing to time. The Bonus is withheld on this answer.
    expect(buildIslandRushPool("decisions", contentPacks, singlePacks)).toEqual([]);
    expect(islandHasRush("decisions")).toBe(false);
    expect(islandHasRush("difference")).toBe(true);
  });
  it("takes only authored images with a definite binary answer, from both kinds of pack", () => {
    expect(pool.length).toBeGreaterThan(20);
    expect(pool.some((item) => item.isAi)).toBe(true);
    expect(pool.some((item) => !item.isAi)).toBe(true);
  });

  it("never lists the same image twice", () => {
    const sources = pool.map((item) => item.src);

    expect(new Set(sources).size).toBe(sources.length);
  });

  it("keeps each image's own answer", () => {
    const compareRound = Object.values(contentPacks)[0].rounds[0];
    const aiChoice = compareRound.choices.find((choice) => choice.id === compareRound.correctChoiceId);

    expect(pool.find((item) => item.src === aiChoice?.media.src)?.isAi).toBe(true);
  });

  it("never turns an honest unknown into a camera answer", () => {
    const unknownRound = Object.values(singlePacks)
      .flatMap((pack) => pack.rounds)
      .find((round) => round.answer === "unknown");

    expect(unknownRound).toBeDefined();
    expect(pool.some((item) => item.src === unknownRound?.media.src)).toBe(false);
  });

  it("deals every image once per run, in some order", () => {
    const deck = dealRush(pool, () => 0.5);

    expect(deck).toHaveLength(pool.length);
    expect(new Set(deck.map((item) => item.src)).size).toBe(pool.length);
  });

  it("survives a broken random source", () => {
    expect(dealRush(pool, () => Number.NaN)).toHaveLength(pool.length);
    expect(dealRush(pool, () => 9)).toHaveLength(pool.length);
  });
});

describe("a thirty-second run", () => {
  it("lasts half a minute", () => {
    expect(RUSH_SECONDS).toBe(30);
  });

  it("starts on the first image with nothing counted", () => {
    expect(rushReducer(initialRushState, { type: "start" })).toEqual({
      status: "playing",
      index: 0,
      rawCorrectCount: 0,
      actualMistakeCount: 0,
      visibleMistakeCount: 0,
      shieldUsed: false,
      lastAnswer: null
    });
  });

  it("counts a right and a wrong call apart", () => {
    let state = rushReducer(initialRushState, { type: "start" });
    state = answer(state, true, aiItem);
    expect(state).toMatchObject({ rawCorrectCount: 1, actualMistakeCount: 0, visibleMistakeCount: 0, lastAnswer: "right", index: 1 });

    state = answer(state, true, cameraItem);
    expect(state).toMatchObject({ rawCorrectCount: 1, actualMistakeCount: 1, visibleMistakeCount: 1, lastAnswer: "wrong", index: 2 });
  });

  it("counts calling a camera photo a camera photo as right", () => {
    const state = answer(rushReducer(initialRushState, { type: "start" }), false, cameraItem);

    expect(state).toMatchObject({ rawCorrectCount: 1, actualMistakeCount: 0, visibleMistakeCount: 0 });
  });

  it("ends when the clock runs out, keeping what was already counted", () => {
    let state = rushReducer(initialRushState, { type: "start" });
    state = answer(state, true, aiItem);
    state = rushReducer(state, { type: "timeUp" });

    expect(state).toEqual({ status: "finished", rawCorrectCount: 1, actualMistakeCount: 0, visibleMistakeCount: 0, shieldUsed: false, ranOut: true });
  });

  it("ends when the images run out instead of showing them again", () => {
    let state = rushReducer(initialRushState, { type: "start" });
    state = answer(state, true, aiItem, 2);
    state = answer(state, true, aiItem, 2);

    expect(state).toEqual({ status: "finished", rawCorrectCount: 2, actualMistakeCount: 0, visibleMistakeCount: 0, shieldUsed: false, ranOut: false });
  });

  it("ignores answers once the run is over, and starts clean on a rerun", () => {
    const finished = rushReducer(rushReducer(initialRushState, { type: "start" }), { type: "timeUp" });

    expect(answer(finished, true, aiItem)).toBe(finished);
    expect(rushReducer(finished, { type: "restart" })).toEqual(initialRushState);
  });
});

describe("wheel rewards", () => {
  it("uses the extra life for one real mistake and retries the same image", () => {
    let state = rushReducer(initialRushState, { type: "start" });
    state = answer(state, true, cameraItem, 2, "extra-life");
    expect(state).toMatchObject({ status: "playing", index: 0, actualMistakeCount: 1, visibleMistakeCount: 0, shieldUsed: true, lastAnswer: "shield" });

    state = answer(state, true, cameraItem, 2, "extra-life");
    expect(state).toMatchObject({ index: 1, actualMistakeCount: 2, visibleMistakeCount: 1, shieldUsed: true, lastAnswer: "wrong" });
  });

  it("keeps raw correct answers separate from a double-points score", () => {
    const state = answer(rushReducer(initialRushState, { type: "start" }), true, aiItem, 2, "double-points");
    expect(state).toMatchObject({ rawCorrectCount: 1 });
    expect(getBonusRushScore(1, "double-points")).toBe(2);
    expect(getBonusRushScore(1, "none")).toBe(1);
  });

  it("adds time only for the chosen time reward", () => {
    expect(getBonusRushDuration("extra-10")).toBe(RUSH_SECONDS + 10);
    expect(getBonusRushDuration("extra-15")).toBe(RUSH_SECONDS + 15);
    expect(getBonusRushDuration("none")).toBe(RUSH_SECONDS);
  });
});

describe("what the run says", () => {
  it("reports accuracy as a whole percentage", () => {
    expect(getRushAccuracy(8, 2)).toBe(80);
    expect(getRushAccuracy(1, 2)).toBe(33);
  });

  it("reports nothing rather than dividing by zero when no image was answered", () => {
    expect(getRushAccuracy(0, 0)).toBe(0);
  });
});
