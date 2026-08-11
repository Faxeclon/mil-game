import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { achievementDefinitions } from "@/features/achievements/achievementModel";
import { initialProgressState } from "@/features/progress/progressState";
import { getActiveProgress, selectProfile, type ProfilesDocument } from "@/features/profiles/localProfiles";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

const componentPath = join(process.cwd(), "src", "components", "RanksClient.tsx");
const stylesPath = join(process.cwd(), "src", "components", "RanksClient.module.css");

describe("progress collection view", () => {
  it("keeps an anchorable title collection with current, reached, and future states", async () => {
    const component = await readFile(componentPath, "utf8");
    const styles = await readFile(stylesPath, "utf8");

    expect(component).toContain('id="titles"');
    expect(component).toContain("rank.stars >= needed");
    expect(component).toContain("styles.rowReached");
    expect(component).toContain("styles.rowLocked");
    expect(component).toContain('t("titleNow")');
    expect(styles).toContain(".statusReached");
    expect(styles).toContain(".statusLocked");
  });

  it("renders the five centralized achievement definitions with localized collection copy", async () => {
    const component = await readFile(componentPath, "utf8");

    expect(achievementDefinitions).toHaveLength(5);
    expect(component).toContain("achievementDefinitions.map");
    expect(component).toContain("progressState.achievementIds");
    expect(component).toContain('tAchievements("collectionCount"');
    expect(component).toContain('tAchievements("collectionHints.perfectIsland"');
    expect(component).toContain('tAchievements("collectionHints.perfectDoublePoints")');

    for (const achievement of achievementDefinitions) {
      expect(spanishMessages.achievements.names[achievement.messageKey]).toBeTruthy();
      expect(englishMessages.achievements.names[achievement.messageKey]).toBeTruthy();
    }
    expect(spanishMessages.achievements.collectionCount).toBe("{count} de {total} desbloqueados");
    expect(englishMessages.achievements.collectionCount).toBe("{count} of {total} unlocked");
  });

  it("reads achievements only from the active profile, without writing progress", () => {
    const profiles: ProfilesDocument = {
      version: 1,
      activeId: "player-1",
      profiles: [
        { id: "player-1", progress: { ...initialProgressState, achievementIds: ["bonus-perfect-training"] } },
        { id: "player-2", progress: initialProgressState }
      ]
    };

    expect(getActiveProgress(profiles).achievementIds).toEqual(["bonus-perfect-training"]);
    expect(getActiveProgress(selectProfile(profiles, "player-2")).achievementIds).toEqual([]);
  });
});
