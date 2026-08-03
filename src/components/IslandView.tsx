"use client";

import { Check, ChevronLeft, LockKeyhole, Play, Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getCategoriesByIsland,
  getLevelDifficulty,
  getMissionsByCategory,
  isTimedMode,
  type IslandKey
} from "@/features/levels/levelModel";
import {
  countCategoryProgress,
  getCategoryState,
  getMissionState
} from "@/features/levels/levelProgress";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";
import styles from "./IslandView.module.css";

/**
 * The inside of an island: its categories, each drawn as a linked chain of sub-islands.
 * One sub-island is one mission, so a tap starts the game instead of opening a list.
 *
 * Nothing here is specific to a particular island; it renders whatever the blueprint
 * declares, which is why a new category or mission needs no change to this file.
 */
export function IslandView({ island }: { island: IslandKey }) {
  const t = useTranslations("islands");
  const { progressState } = useProgress();
  const categories = getCategoriesByIsland(island);

  return (
    <div className={styles.island}>
      <Link className={styles.back} href="/worlds">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("backToMap")}
      </Link>

      <h1 className={styles.title}>{t("islandTitle", { name: t(`list.${island}.title`) })}</h1>
      <p className={styles.subtitle}>{t(`list.${island}.description`)}</p>

      {categories.map((category) => {
        const missions = getMissionsByCategory(category.key);
        const categoryState = getCategoryState(progressState, category.key);
        const { done, total } = countCategoryProgress(progressState, category.key);

        return (
          <section
            aria-labelledby={`category-${category.key}`}
            className={`${styles.group} ${styles[categoryState]}`}
            key={category.key}
          >
            <header className={styles.groupHeader}>
              <h2 className={styles.groupTitle} id={`category-${category.key}`}>
                {t(`categories.${category.key}.title`)}
              </h2>
              {total > 0 && (
                <p className={styles.groupCount}>{t("categoryProgress", { done, total })}</p>
              )}
            </header>

            <ol className={styles.chain}>
              {missions.map((mission) => {
                const state = getMissionState(progressState, mission);
                const isPlayable = Boolean(mission.packId);
                const isAvailable = state === "available" && isPlayable;
                const isCompleted = state === "completed";
                const difficulty = getLevelDifficulty(mission.mode);

                const body = (
                  <>
                    <span className={styles.orb}>
                      {isCompleted ? (
                        <Check aria-hidden="true" size={24} strokeWidth={3} />
                      ) : isAvailable ? (
                        <Play aria-hidden="true" size={22} fill="currentColor" />
                      ) : (
                        <LockKeyhole aria-hidden="true" size={18} />
                      )}
                      <span className={styles.orbNumber}>{mission.order}</span>
                    </span>
                    <span className={styles.caption}>
                      <span className={styles.mode}>{t(`modes.${mission.mode}`)}</span>
                      <span className={`${styles.difficulty} ${styles[difficulty]}`}>
                        {t(`difficulty.${difficulty}`)}
                      </span>
                      {isTimedMode(mission.mode) && (
                        <span className={styles.timing}>
                          <Timer aria-hidden="true" size={12} />
                          {t("secondsPerRound", { seconds: mission.secondsPerRound ?? 0 })}
                        </span>
                      )}
                      {!isPlayable && <span className={styles.soon}>{t("comingSoon")}</span>}
                    </span>
                  </>
                );

                const stateClass = isAvailable
                  ? styles.available
                  : isCompleted
                    ? styles.completed
                    : styles.locked;

                return (
                  <li className={`${styles.step} ${stateClass}`} key={mission.id}>
                    {isPlayable && state !== "locked" ? (
                      <Link
                        aria-label={t("missionAria", {
                          number: mission.order,
                          mode: t(`modes.${mission.mode}`),
                          status: isAvailable ? t("available") : t("completed")
                        })}
                        className={styles.mission}
                        href={`/level/${mission.id}`}
                      >
                        {body}
                      </Link>
                    ) : (
                      <span className={styles.mission}>{body}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
