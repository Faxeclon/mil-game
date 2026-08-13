import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contentPacks, singlePacks } from "@/content/packs/packRegistry";
import { buildIslandRushPool } from "@/features/rush/rushState";
import { initialProgressState, parseProgressState, PROGRESS_VERSION, type ProgressState } from "@/features/progress/progressState";
import {
  getCategoriesByIsland,
  getMissionById,
  isLevelId,
  legacyRetiredLevelIds
} from "./levelModel";
import {
  countPlayableMissions,
  getAvailableMission,
  getNextMission,
  isIslandCompleted,
  isMissionUnlocked
} from "./levelProgress";
import { getGlobalProgress, getIslandProgress } from "./progressSummary";

describe("retired Memes content", () => {
  const legacyWithMemes: ProgressState = { ...initialProgressState, completedLevelIds: ["memes-1", "memes-2"] };

  it("keeps only legacy IDs, not playable Meme content", () => {
    expect(legacyRetiredLevelIds).toEqual(["memes-1", "memes-2"]);
    expect(isLevelId("memes-1")).toBe(true);
    expect(isLevelId("memes-2")).toBe(true);
    expect(getMissionById("memes-1")).toBeUndefined();
    expect(getCategoriesByIsland("difference").map((category) => category.key)).toEqual(["animals", "sports"]);
  });

  it("does not count legacy Meme completions toward active progress or island completion", () => {
    expect(getIslandProgress(legacyWithMemes, "difference")).toMatchObject({ done: 0, total: 5, percent: 0 });
    expect(getGlobalProgress(legacyWithMemes).done).toBe(0);
    expect(isIslandCompleted(legacyWithMemes, "difference")).toBe(false);
    expect(countPlayableMissions()).toBe(12);
  });

  it("hydrates legacy Meme IDs without retaining their removed content", () => {
    const restored = parseProgressState({ version: PROGRESS_VERSION, completedLevelIds: ["memes-1", "memes-2", "animals-1"] });
    expect(restored.completedLevelIds).toEqual(["memes-1", "memes-2", "animals-1"]);
    expect(getIslandProgress(restored, "difference")).toMatchObject({ done: 1, total: 5, percent: 20 });
  });

  it("never selects Memes for navigation, unlocks, or the island Bonus pool", () => {
    expect(isMissionUnlocked(legacyWithMemes, "memes-1")).toBe(false);
    expect(getAvailableMission(legacyWithMemes, "sports")?.id).toBe("sports-1");
    expect(getNextMission(legacyWithMemes)?.id).not.toMatch(/^memes-/);
    expect(buildIslandRushPool("difference", contentPacks, singlePacks).every((item) => !item.id.startsWith("memes-"))).toBe(true);
  });

  it("does not generate retired Meme routes", async () => {
    const page = await readFile(join(process.cwd(), "src", "app", "[locale]", "level", "[levelId]", "page.tsx"), "utf8");
    expect(page).toContain("if (!mission || (!pack && !singlePack && !decisionPack)) notFound()");
  });
});
