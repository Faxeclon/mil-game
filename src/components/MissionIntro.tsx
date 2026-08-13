"use client";

import { useState, type ReactNode } from "react";
import { MapPin, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import { getMissionIntro } from "@/features/levels/missionIntro";
import { getIslandStoryScenes } from "@/features/onboarding/islandStory";
import { useProgress } from "@/features/progress/ProgressProvider";
import { IslandStory } from "./IslandStory";
import styles from "./MissionIntro.module.css";

/**
 * Roqui presenting a new island, or a new theme inside one, before the mission opens.
 *
 * A child crossing from one island to the next has arrived somewhere, and saying so is
 * what turns a list of levels into a journey. It happens on the way in and never again:
 * the moment is derived from the map, so replaying a mission does not replay the arrival.
 *
 * Nothing here knows which island it is announcing. It asks the level model, so an island
 * or a theme added later is introduced without touching this file.
 */
export function MissionIntro({ missionId, children }: { missionId: string; children: ReactNode }) {
  const t = useTranslations("islands");
  const { hydrated, progressState } = useProgress();
  const [dismissed, setDismissed] = useState(false);

  // Until the stored progress is known there is no way to tell an arrival from a replay.
  if (!hydrated || dismissed) return <>{children}</>;

  const intro = getMissionIntro(progressState, missionId);
  if (!intro) return <>{children}</>;

  const isIsland = intro.kind === "island";

  /*
   * An island with scenes tells them instead of saying its line.
   *
   * Same moment, same trigger, same one-time rule - only richer, and only where the turn in
   * the game is big enough to be worth stopping for. An island without scenes never learns
   * this file exists.
   */
  if (isIsland) {
    const scenes = getIslandStoryScenes(intro.islandKey);
    if (scenes.length > 0) {
      return (
        <IslandStory islandKey={intro.islandKey} scenes={scenes} onComplete={() => setDismissed(true)} />
      );
    }
  }

  const title = isIsland ? t(`list.${intro.islandKey}.title`) : t(`categories.${intro.categoryKey}.title`);
  const line = isIsland ? t(`list.${intro.islandKey}.intro`) : t(`categories.${intro.categoryKey}.intro`);

  return (
    <button className={`${styles.intro} app-chrome-hidden`} type="button" onClick={() => setDismissed(true)}>
      <span className={styles.stage}>
        <span className={styles.chip}>
          {isIsland ? <MapPin aria-hidden="true" size={13} /> : <Sparkles aria-hidden="true" size={13} />}
          {isIsland ? t("introArrival") : t("introTheme")}
        </span>

        <span className={styles.bubble}>
          <span className={styles.title}>{title}</span>
          <span className={styles.line}>{line}</span>
        </span>

        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="welcoming" priority />

        <span aria-hidden="true" className={styles.hint}>
          {t("introContinue")}
        </span>
      </span>

      <span aria-live="polite" className={styles.srOnly}>
        {line}
      </span>
    </button>
  );
}
