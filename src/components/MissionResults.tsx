"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bird, Cat, Feather, Star, Trophy, Turtle, Wind, Rabbit, Zap, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { playSound } from "@/features/audio/soundEffects";
import { Narrator } from "@/components/Narrator";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import { LocalMedalToast } from "./LocalMedalToast";
import { BonusAchievementCelebration } from "./BonusAchievementCelebration";
import { getIslandOfMission, getMissionById, type LevelId } from "@/features/levels/levelModel";
import { getNextLevelInSection, getSectionCompletionEvent, type SectionCompletionEvent } from "@/features/levels/levelProgress";
import { getBonusDestinationPath, getBonusOpportunityId, type BonusDestination } from "@/features/bonus/bonusOpportunity";
import { islandHasRush } from "@/features/rush/rushState";
import { getIslandCompletionAchievementIds, type AchievementId } from "@/features/achievements/achievementModel";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import {
  apprenticeAvatarIds,
  defaultApprenticeAvatarId,
  type ApprenticeAvatarId
} from "@/features/profile/apprenticeAvatar";
import { useProgress } from "@/features/progress/ProgressProvider";
import { getGameFinale, hasFinishedEveryMission } from "@/features/results/gameFinale";
import { GameFinale } from "./GameFinale";
import { getReplayPath } from "@/features/results/resultNavigation";
import { formatElapsedTime, getFreshResult, getRequestedAttempt } from "@/features/results/resultPresentation";
import { getScoreSummary } from "@/features/results/scoreSummary";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./MissionResults.module.css";

const apprenticeAvatarIcons: Record<ApprenticeAvatarId, LucideIcon> = {
  eagle: Bird,
  fox: Wind,
  rabbit: Rabbit,
  turtle: Turtle,
  owl: Feather,
  cat: Cat
};

/** Shows only the latest persisted result when its URL names that exact attempt. */
export function MissionResults() {
  const t = useTranslations("results");
  const tIslands = useTranslations("islands");
  const tHome = useTranslations("home");
  const accessibility = useAccessibility();
  const router = useRouter();
  const {
    hydrated,
    lastResult,
    profiles,
    progressState,
    apprenticeAvatarId,
    createBonusOpportunity,
    activateBonusOpportunity,
    consumeBonusOpportunity,
    markLocalMedalNoticePresented,
    acknowledgeAchievementCelebration
  } = useProgress();
  const searchParams = useSearchParams();
  const attempt = getRequestedAttempt(searchParams);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusedResultRef = useRef<string | null>(null);
  const navigateOnceRef = useRef(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const bonusPlayRef = useRef<HTMLButtonElement>(null);
  const bonusDialogRef = useRef<HTMLElement>(null);
  const [bonusOfferOpen, setBonusOfferOpen] = useState(false);
  const [finaleDismissed, setFinaleDismissed] = useState(false);
  const [finaleAchievementToastIds, setFinaleAchievementToastIds] = useState<AchievementId[]>([]);
  const [localMedalToastKey, setLocalMedalToastKey] = useState<string | null>(null);
  const result = getFreshResult(lastResult, attempt);
  const localMedalToastCandidateKey = result?.passed && progressState.completedLevelIds.length === 1 && !progressState.localMedalNoticePresented
    ? `${profiles.activeId ?? "none"}:${result.attemptId ?? "legacy"}`
    : null;
  const celebration: SectionCompletionEvent | null = result
    ? getSectionCompletionEvent(progressState, result.levelId)
    : null;
  const focusKey = result ? `result:${result.attemptId}` : `empty:${attempt ?? ""}`;
  const resultPassed = result?.passed === true;
  /*
   * No Bonus where there is no Rush to spend it on. The deciding island has no pictures,
   * so its ticket would open an empty run - and a reward that leads nowhere is worse than
   * no reward, because the child already believed they had won something.
   */
  const bonusId = celebration && islandHasRush(celebration.islandKey)
    ? getBonusOpportunityId(celebration.categoryKey, celebration.completionAttemptId)
    : null;
  const bonus = bonusId ? progressState.bonusOpportunities.find((entry) => entry.id === bonusId) : undefined;
  const islandCompletionAchievementIds = celebration?.islandCompleted
    ? getIslandCompletionAchievementIds(celebration.islandKey).filter((id) => progressState.pendingAchievementCelebrationIds.includes(id))
    : [];
  const gameFinished = !finaleDismissed && hasFinishedEveryMission(progressState);

  useEffect(() => {
    if (!hydrated || focusedResultRef.current === focusKey) return;
    headingRef.current?.focus();
    focusedResultRef.current = focusKey;
    /*
     * Sounded on the same moment the heading takes focus, and keyed on the same attempt.
     * That key is what a reload cannot fake: coming back to this page later re-reads a
     * result already seen, and a fanfare for it would celebrate nothing that just happened.
     *
     * Only a pass. Not passing is an invitation to try again, and a jingle over it would
     * read as applause for having got it wrong.
     */
    if (resultPassed) playSound("missionComplete");
  }, [focusKey, hydrated, resultPassed]);

  useEffect(() => {
    if (celebration) continueRef.current?.focus();
  }, [celebration]);

  /* The event carries the persisted attempt id, so this remains safe across renders and reloads. */
  useEffect(() => {
    if (!celebration || !bonusId) return;
    const destination: BonusDestination = celebration.destination.kind === "island"
      ? { kind: "island", islandKey: celebration.destination.islandKey }
      : { kind: "worlds" };
    createBonusOpportunity({
      id: bonusId,
      categoryKey: celebration.categoryKey,
      islandKey: celebration.islandKey,
      destination
    });
  }, [bonusId, celebration, createBonusOpportunity]);

  useEffect(() => {
    if (bonusOfferOpen && bonus?.status === "pending") bonusPlayRef.current?.focus();
  }, [bonus?.status, bonusOfferOpen]);

  useEffect(() => {
    if (!localMedalToastCandidateKey || localMedalToastKey === localMedalToastCandidateKey) return;
    const presentationTimer = window.setTimeout(() => setLocalMedalToastKey(localMedalToastCandidateKey), 0);
    return () => clearTimeout(presentationTimer);
  }, [localMedalToastCandidateKey, localMedalToastKey]);

  if (!hydrated) {
    return (
      <p className={`${styles.loading} app-chrome-hidden`} role="status">
        {t("loading")}
      </p>
    );
  }

  if (!result) {
    return (
      <section aria-labelledby="results-title" className={`${styles.empty} app-chrome-hidden`}>
        <h1 className={styles.emptyTitle} id="results-title" ref={headingRef} tabIndex={-1}>
          {t("emptyTitle")}
        </h1>
        <p className={styles.emptyText}>{t("emptyDescription")}</p>
        <Link className={styles.primaryLink} href="/worlds">
          {t("returnToIslands")}
        </Link>
      </section>
    );
  }

  /*
   * The end of the map, shown once, over the result that closed it.
   *
   * Tied to a fresh result rather than to a stored flag: coming back to this page later
   * re-reads a result already seen, and celebrating the end of the game again would make
   * the moment worth nothing. Nothing new is persisted for it either - the whole screen is
   * derived from completions and best runs, which were already being kept.
   */
  if (gameFinished) {
    const achievementToastIds = finaleAchievementToastIds.length > 0
      ? finaleAchievementToastIds
      : islandCompletionAchievementIds;
    const acknowledgeFinalAchievementCelebration = (ids: readonly AchievementId[]) => {
      /*
       * The final island may earn an achievement at the exact moment the whole map closes.
       * Keep those IDs mounted after they are acknowledged, otherwise that persisted update
       * would unmount the toast before a child can see it.
       */
      setFinaleAchievementToastIds((current) => current.length > 0 ? current : [...ids]);
      acknowledgeAchievementCelebration(ids);
    };

    return (
      <>
        <GameFinale finale={getGameFinale(progressState)} onClose={() => setFinaleDismissed(true)} />
        {achievementToastIds.length > 0 && (
          <BonusAchievementCelebration
            ids={achievementToastIds}
            onDismissed={() => setFinaleAchievementToastIds([])}
            onPresented={acknowledgeFinalAchievementCelebration}
          />
        )}
      </>
    );
  }

  const mission = getMissionById(result.levelId);
  const nextLevel = result.passed ? getNextLevelInSection(result.levelId) : null;
  const islandKey = getIslandOfMission(result.levelId);
  const mapPath = islandKey ? `/island/${islandKey}` : "/worlds";
  const avatarId = apprenticeAvatarId ?? defaultApprenticeAvatarId;
  const AvatarIcon = apprenticeAvatarIcons[avatarId];
  const apprenticeNames = tHome.raw("profileAvatars") as string[];
  const apprenticeName = apprenticeNames[apprenticeAvatarIds.indexOf(avatarId)] ?? avatarId;
  const levelIdentity = mission
    ? t("levelIdentity", {
        category: tIslands(`categories.${mission.category}.title`),
        number: mission.order
      })
    : result.levelId;
  const summary = getScoreSummary(result, progressState.bestResultsByLevelId);
  const elapsedTime = formatElapsedTime(result.elapsedMs, {
    second: t("second"),
    seconds: t("seconds"),
    minute: t("minute"),
    minutes: t("minutes"),
    join: t("timeJoin"),
    notRecorded: t("timeNotRecorded")
  });
  const completeCelebration = () => {
    if (!celebration || navigateOnceRef.current) return;
    if (bonus?.status === "consumed" || bonus?.status === "active") return;
    if (!bonus) {
      navigateOnceRef.current = true;
      router.push(
        celebration.destination.kind === "island"
          ? getBonusDestinationPath({ kind: "island", islandKey: celebration.destination.islandKey })
          : getBonusDestinationPath({ kind: "worlds" })
      );
      return;
    }
    setBonusOfferOpen(true);
  };

  const declineBonus = () => {
    if (!bonus || bonus.status !== "pending" || navigateOnceRef.current) return;
    navigateOnceRef.current = true;
    consumeBonusOpportunity(bonus.id);
    router.push(getBonusDestinationPath(bonus.destination));
  };

  const playBonus = () => {
    if (!bonus || bonus.status !== "pending" || navigateOnceRef.current) return;
    navigateOnceRef.current = true;
    activateBonusOpportunity(bonus.id);
    // 3C will make the route admit only this active opportunity.
    router.push(`/island/${bonus.islandKey}/rush`);
  };

  return (
    <section aria-labelledby="results-title" className={`${styles.results} app-chrome-hidden`}>
      <span className={styles.badge}>
        <MascotSlot alt={tHome("mascotAlt")} className={styles.mascot} mood="celebrating" priority />
        <span aria-hidden="true" className={`${styles.spark} ${styles.sparkOne}`} />
        <span aria-hidden="true" className={`${styles.spark} ${styles.sparkTwo}`} />
        <span aria-hidden="true" className={`${styles.spark} ${styles.sparkThree}`} />
      </span>

      <span
        aria-label={tHome("profileAvatarAria", { name: apprenticeName })}
        className={styles.apprenticeAvatar}
        role="img"
      >
        <AvatarIcon aria-hidden="true" strokeWidth={2} />
      </span>

      <h1 className={styles.title} id="results-title" ref={headingRef} tabIndex={-1}>
        {result.passed ? t("title") : t("notPassedTitle")}
      </h1>
      <p className={styles.levelIdentity}>{levelIdentity}</p>
      <p className={styles.text}>{result.passed ? t("description") : t("notPassedDescription")}</p>

      {/*
       * How it went, and whether a record fell. Reading only the question and never the
       * outcome would leave a child who cannot read guessing at whether they did well.
       */}
      <Narrator
        lines={[
          result.passed ? t("title") : t("notPassedTitle"),
          levelIdentity,
          t("description"),
          summary.isNewRecord ? t("newRecord") : null,
          summary.score === null
            ? t("scoreUnavailable")
            : `${t("scoreLabel")}: ${summary.score}. ${t("starsAria", { stars: summary.stars, total: 3 })}`
        ]}
      />

      {/* The score of this attempt, and the mission record it did or did not beat. Nothing
          here announces itself: the heading already took focus, so a reload stays quiet. */}
      <div className={styles.scoreCard}>
        {summary.isNewRecord && (
          <p className={styles.recordBadge}>
            <Trophy aria-hidden="true" size={15} />
            {t("newRecord")}
          </p>
        )}

        <p className={styles.scoreLabel}>{t("scoreLabel")}</p>

        {summary.score === null ? (
          <p className={styles.scoreMissing}>{t("scoreUnavailable")}</p>
        ) : (
          <>
            <span
              aria-label={t("starsAria", { stars: summary.stars, total: 3 })}
              className={styles.stars}
              role="img"
            >
              {[1, 2, 3].map((position) => (
                <Star
                  aria-hidden="true"
                  className={position <= summary.stars ? styles.starEarned : styles.starEmpty}
                  fill={position <= summary.stars ? "currentColor" : "none"}
                  key={position}
                  size={28}
                  strokeWidth={2}
                />
              ))}
            </span>
            <p className={styles.scoreValue}>{t("scorePoints", { score: summary.score })}</p>
          </>
        )}

        {summary.isNewRecord && <p className={styles.recordHint}>{t("newRecordHint")}</p>}

        {summary.showsBest && summary.best !== null && (
          <p className={styles.bestScore}>
            <span className={styles.bestScoreLabel}>{t("bestScoreLabel")}</span>
            <span className={styles.bestScoreValue}>{t("scorePoints", { score: summary.best })}</span>
          </p>
        )}

        {summary.score === null && summary.best === null && (
          <p className={styles.bestScoreLabel}>{t("noBestScore")}</p>
        )}
      </div>

      <p className={styles.correctRounds}>{t("correctRounds", { correct: result.correctRounds, total: result.totalRounds })}</p>
      <p className={styles.elapsedTime}>{t("elapsed", { time: elapsedTime })}</p>

      {localMedalToastKey === `${profiles.activeId ?? "none"}:${result.attemptId ?? "legacy"}` && (
        <LocalMedalToast onPresented={markLocalMedalNoticePresented} />
      )}
      {islandCompletionAchievementIds.length > 0 && (
        <BonusAchievementCelebration ids={islandCompletionAchievementIds} onPresented={acknowledgeAchievementCelebration} />
      )}

      <div className={styles.actions}>
        {result.passed && nextLevel && (
          <div className={styles.nextLevelAction}>
            <Link className={styles.primaryLink} href={getReplayPath(nextLevel.id as LevelId)}>
              {t("nextLevel")}
            </Link>
            <p className={styles.nextLevelPreview}>
              {t("levelIdentity", {
                category: tIslands(`categories.${nextLevel.category}.title`),
                number: nextLevel.order
              })}
            </p>
          </div>
        )}
        {!result.passed && (
          <Link className={styles.primaryLink} href={getReplayPath(result.levelId)}>
            {t("tryAgain")}
          </Link>
        )}
        <Link className={styles.secondaryLink} href={mapPath}>
          {t("backToMap")}
        </Link>
      </div>

      {celebration && !bonusOfferOpen && bonus?.status !== "consumed" && bonus?.status !== "active" && (
        <div className={styles.completionOverlay}>
          <section
            aria-describedby="completion-description"
            aria-labelledby="completion-title"
            aria-modal="true"
            className={`${styles.completionDialog} ${accessibility.reducedMotion ? styles.completionStill : ""}`}
            onKeyDown={(event) => {
              if (event.key === "Escape" || event.key === "Tab") {
                event.preventDefault();
                if (event.key === "Escape") completeCelebration();
              }
            }}
            role="dialog"
          >
            <span aria-hidden="true" className={styles.completionMedal}>★</span>
            <h2 id="completion-title">{t("sectionComplete")}</h2>
            <p id="completion-description">
              {t("sectionCompleteDescription", { sectionName: tIslands(`categories.${celebration.categoryKey}.title`) })}
            </p>
            {celebration.islandCompleted && (
              <p className={styles.islandComplete}>{t("islandComplete")} {t("islandCompleteDescription")}</p>
            )}
            <button className={styles.completionAction} onClick={completeCelebration} ref={continueRef} type="button">
              {t("continue")}
            </button>
          </section>
        </div>
      )}

      {bonusOfferOpen && bonus?.status === "pending" && (
        <div className={styles.completionOverlay}>
          <section
            aria-describedby="bonus-description"
            aria-labelledby="bonus-title"
            aria-modal="true"
            className={`${styles.completionDialog} ${styles.bonusDialog} ${accessibility.reducedMotion ? styles.completionStill : ""}`}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                declineBonus();
                return;
              }
              if (event.key !== "Tab") return;
              const controls = bonusDialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [];
              const first = controls[0];
              const last = controls[controls.length - 1];
              if (!first || !last) return;
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
            ref={bonusDialogRef}
            role="dialog"
          >
            <span aria-hidden="true" className={styles.bonusMedal}><Zap size={25} strokeWidth={2.5} /></span>
            <h2 id="bonus-title">{t("bonusUnlocked")}</h2>
            <p id="bonus-description">{t("bonusChallenge")}</p>
            <p className={styles.bonusChance}>{t("bonusOneChance")}</p>
            <div className={styles.bonusActions}>
              <button className={styles.completionAction} onClick={playBonus} ref={bonusPlayRef} type="button">
                {t("bonusPlayNow")}
              </button>
              <button className={styles.bonusDecline} onClick={declineBonus} type="button">
                {t("bonusNotNow")}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
