"use client";

import { Check, ChevronLeft, Hourglass, LockKeyhole, Play, Star, Timer } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getCategoriesByIsland,
  getLevelDifficulty,
  getMissionById,
  getMissionsByCategory,
  isTimedMode,
  type IslandKey
} from "@/features/levels/levelModel";
import {
  countCategoryProgress,
  getCategoryState,
  getMissionState
} from "@/features/levels/levelProgress";
import { getIslandProgress, getMissionRequirement } from "@/features/levels/progressSummary";
import { getBestResult } from "@/features/progress/bestResults";
import { getStarCount } from "@/features/scoring/levelScore";
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
  const islandProgress = getIslandProgress(progressState, island);

  /** Names a mission the way it is written on the map, for the "finish X first" line. */
  const describeMission = (missionId: string): string => {
    const blocking = getMissionById(missionId);
    return blocking
      ? t("missionIdentity", {
          category: t(`categories.${blocking.category}.title`),
          number: blocking.order
        })
      : missionId;
  };

  return (
    <div className={styles.island}>
      <Link className={styles.back} href="/worlds">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("backToMap")}
      </Link>

      <h1 className={styles.title}>{t("islandTitle", { name: t(`list.${island}.title`) })}</h1>
      <p className={styles.subtitle}>{t(`list.${island}.description`)}</p>

      {/* An island with nothing playable says so; it is not a mission left at zero. */}
      {islandProgress.isEmpty ? (
        <p className={styles.islandEmpty}>{t("islandEmpty")}</p>
      ) : (
        <div className={styles.islandProgress}>
          <p className={styles.islandProgressTop}>
            <span className={styles.islandProgressLabel}>{t("islandProgressLabel")}</span>
            <span className={styles.islandProgressValue}>
              {t("islandProgress", { done: islandProgress.done, total: islandProgress.total })}
              {" · "}
              {t("percent", { percent: islandProgress.percent })}
            </span>
          </p>
          <div
            aria-label={t("islandProgressAria", {
              done: islandProgress.done,
              total: islandProgress.total
            })}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={islandProgress.percent}
            aria-valuetext={t("percent", { percent: islandProgress.percent })}
            className={styles.islandProgressTrack}
            role="progressbar"
          >
            <span
              className={styles.islandProgressFill}
              style={{ width: `${islandProgress.percent}%` }}
            />
          </div>
        </div>
      )}

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
                const requirement = getMissionRequirement(progressState, mission);
                const best = isCompleted ? getBestResult(progressState.bestResultsByLevelId, mission.id) : undefined;
                const stars = best ? getStarCount(best.score) : 0;

                const body = (
                  <>
                    <span className={styles.orb}>
                      {isCompleted ? (
                        <Check aria-hidden="true" size={24} strokeWidth={3} />
                      ) : isAvailable ? (
                        <Play aria-hidden="true" size={22} fill="currentColor" />
                      ) : isPlayable ? (
                        <LockKeyhole aria-hidden="true" size={18} />
                      ) : (
                        /* A different shape, not just a different colour, so a mission that
                           does not exist yet never reads as one the player failed to unlock. */
                        <Hourglass aria-hidden="true" size={18} />
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

                      {best && (
                        <span className={styles.best}>
                          <span
                            aria-label={t("starsAria", { stars, total: 3 })}
                            className={styles.stars}
                            role="img"
                          >
                            {[1, 2, 3].map((position) => (
                              <Star
                                aria-hidden="true"
                                className={position <= stars ? styles.starEarned : styles.starEmpty}
                                fill={position <= stars ? "currentColor" : "none"}
                                key={position}
                                size={13}
                                strokeWidth={2.2}
                              />
                            ))}
                          </span>
                          {t("missionBest", { score: best.score })}
                        </span>
                      )}

                      {requirement.kind === "requiresMission" && (
                        <span className={styles.requirement}>
                          {t("lockedBy", { mission: describeMission(requirement.missionId) })}
                        </span>
                      )}
                      {requirement.kind === "locked" && (
                        <span className={styles.requirement}>{t("lockedGeneric")}</span>
                      )}
                      {requirement.kind === "comingSoon" && (
                        <span className={styles.requirement}>{t("comingSoonHint")}</span>
                      )}
                    </span>
                  </>
                );

                const stateClass = isAvailable
                  ? styles.available
                  : isCompleted
                    ? styles.completed
                    : isPlayable
                      ? styles.locked
                      : styles.upcoming;

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
