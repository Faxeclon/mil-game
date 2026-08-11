"use client";

import { Check, ChevronLeft, Egg, Film, LockKeyhole, Medal, Search, ShieldCheck, Star, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Narrator } from "@/components/Narrator";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import { achievementDefinitions, type AchievementIcon } from "@/features/achievements/achievementModel";
import { useProgress } from "@/features/progress/ProgressProvider";
import {
  getPlayerRank,
  RANK_THRESHOLDS,
  STARS_PER_MISSION,
  titleKeys,
  type RankTier
} from "@/features/ranks/playerRank";
import { Link } from "@/i18n/navigation";
import styles from "./RanksClient.module.css";

const TIERS: readonly RankTier[] = ["bronze", "silver", "gold"];

/** Where a tier begins, as a share of the stars on offer. */
const TIER_FLOOR: Readonly<Record<RankTier, number>> = {
  bronze: 0,
  silver: RANK_THRESHOLDS.silver,
  gold: RANK_THRESHOLDS.gold
};

/** Stars a title needs, kept beside the titles it describes. */
const TITLE_STARS: Readonly<Record<(typeof titleKeys)[number], number>> = {
  beginner: 0,
  curious: 1,
  detective: 5,
  expert: 9,
  master: 13
};

const ACHIEVEMENT_ICONS: Readonly<Record<AchievementIcon, LucideIcon>> = {
  star: Star,
  search: Search,
  detective: ShieldCheck,
  film: Film,
  egg: Egg
};

/**
 * What there is to earn, and where the player stands in it.
 *
 * A rank the game never explains is a badge that appears for no reason. This page shows
 * the whole ladder at once, with the number of stars each step asks for, so a child can
 * see that the next one is reachable rather than being told they are "Bronze".
 *
 * Nothing here is a comparison with anybody: the ladder is the same for every player and
 * the only figure on it is their own.
 */
export function RanksClient() {
  const t = useTranslations("rank");
  const tAchievements = useTranslations("achievements");
  const tHome = useTranslations("home");
  const tIslands = useTranslations("islands");
  const { hydrated, progressState } = useProgress();
  const rank = getPlayerRank(progressState);
  const earnedAchievementIds = new Set(progressState.achievementIds);

  const starsForPercent = (percent: number) => Math.ceil((percent / 100) * rank.maxStars);

  return (
    <div className={styles.ranks}>
      <Link className={styles.back} href="/">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("back")}
      </Link>

      <MascotSlot alt={tHome("mascotAlt")} className={styles.mascot} mood="celebrating" priority />
      {/* The title and how it is earned. The ladder itself is a list of names and numbers,
          which a synthesiser reads as a drone, so it is left on the page. */}
      <Narrator lines={[t("progressTitle"), t("howItWorks")]} />

      <h1 className={styles.title}>{t("progressTitle")}</h1>
      <p className={styles.lead}>{t("howItWorks")}</p>

      <p className={styles.standing}>
        <Star aria-hidden="true" fill="currentColor" size={16} />
        {hydrated ? t("stars", { stars: rank.stars, max: rank.maxStars }) : t("none")}
      </p>

      <section aria-labelledby="ranks-tiers" className={styles.group}>
        <h2 className={styles.groupTitle} id="ranks-tiers">
          {t("rankTitle")}
        </h2>

        <ul className={styles.list}>
          {TIERS.map((tier) => {
            const needed = starsForPercent(TIER_FLOOR[tier]);
            const reached = hydrated && rank.tier === tier;
            const passed = hydrated && rank.stars >= needed && rank.tier !== null;

            return (
              <li className={`${styles.row} ${reached ? styles.rowNow : ""}`} key={tier}>
                <span className={`${styles.medal} ${styles[tier]}`}>
                  <Medal aria-hidden="true" size={20} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{t(`tiers.${tier}`)}</span>
                  <span className={styles.rowDetail}>
                    {needed === 0 ? t("tierFirst") : t("tierNeeds", { stars: needed })}
                  </span>
                </span>
                {reached ? (
                  <span className={styles.now}>{t("tierNow")}</span>
                ) : passed ? (
                  <Check aria-hidden="true" className={styles.done} size={17} strokeWidth={3} />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="ranks-titles" className={styles.group} id="titles">
        <h2 className={styles.groupTitle} id="ranks-titles">
          {t("titlesTitle")}
        </h2>
        <p className={styles.groupLead}>{t("titlesLead", { perMission: STARS_PER_MISSION })}</p>

        <ul className={styles.list}>
          {titleKeys.map((key) => {
            const needed = TITLE_STARS[key];
            const isCurrent = hydrated && rank.titleKey === key;
            const isReached = hydrated && rank.stars >= needed;

            return (
              <li
                className={`${styles.row} ${isCurrent ? styles.rowNow : isReached ? styles.rowReached : styles.rowLocked}`}
                key={key}
              >
                <span className={styles.starCount}>{needed}</span>
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{t(`titles.${key}`)}</span>
                  <span className={styles.rowDetail}>
                    {needed === 0 ? t("titleStart") : t("tierNeeds", { stars: needed })}
                  </span>
                </span>
                {isCurrent ? (
                  <span className={styles.now}>{t("titleNow")}</span>
                ) : isReached ? (
                  <span className={styles.statusReached}>
                    <Check aria-hidden="true" size={15} strokeWidth={3} />
                    {t("titleReached")}
                  </span>
                ) : (
                  <span className={styles.statusLocked}>
                    <LockKeyhole aria-hidden="true" size={14} />
                    {t("titleLocked")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="ranks-achievements" className={styles.group}>
        <h2 className={styles.groupTitle} id="ranks-achievements">
          {tAchievements("collectionTitle")}
        </h2>
        <p className={styles.groupLead}>
          {tAchievements("collectionCount", {
            count: earnedAchievementIds.size,
            total: achievementDefinitions.length
          })}
        </p>

        <ul className={styles.list}>
          {achievementDefinitions.map((achievement) => {
            const earned = earnedAchievementIds.has(achievement.id);
            const Icon = ACHIEVEMENT_ICONS[achievement.icon];
            const hint = achievement.collectionHint === "perfect-island" && "islandKey" in achievement
              ? tAchievements("collectionHints.perfectIsland", {
                  island: tIslands(`list.${achievement.islandKey}.title`)
                })
              : tAchievements("collectionHints.perfectDoublePoints");

            return (
              <li className={`${styles.row} ${earned ? styles.rowReached : styles.rowLocked}`} key={achievement.id}>
                <span className={`${styles.achievementIcon} ${earned ? styles.achievementEarned : styles.achievementLocked}`}>
                  {earned ? <Icon aria-hidden="true" size={20} /> : <LockKeyhole aria-hidden="true" size={19} />}
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{tAchievements(`names.${achievement.messageKey}`)}</span>
                  <span className={styles.rowDetail}>{hint}</span>
                </span>
                <span className={earned ? styles.statusReached : styles.statusLocked}>
                  {earned ? <Check aria-hidden="true" size={15} strokeWidth={3} /> : <LockKeyhole aria-hidden="true" size={14} />}
                  {earned ? tAchievements("unlocked") : tAchievements("locked")}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
