"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Bird, Cat, Feather, Star, Trophy, Turtle, Wind, Rabbit, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Narrator } from "@/components/Narrator";
import { LookAskCheck } from "@/components/LookAskCheck";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import { getMissionById } from "@/features/levels/levelModel";
import { getSectionCompletionEvent, type SectionCompletionEvent } from "@/features/levels/levelProgress";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import {
  apprenticeAvatarIds,
  defaultApprenticeAvatarId,
  type ApprenticeAvatarId
} from "@/features/profile/apprenticeAvatar";
import { useProgress } from "@/features/progress/ProgressProvider";
import { getContinuePath, getReplayPath } from "@/features/results/resultNavigation";
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
  const tStorage = useTranslations("storage");
  const tGuardian = useTranslations("guardian");
  const accessibility = useAccessibility();
  const router = useRouter();
  const { hydrated, lastResult, progressState, apprenticeAvatarId } = useProgress();
  const searchParams = useSearchParams();
  const attempt = getRequestedAttempt(searchParams);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusedResultRef = useRef<string | null>(null);
  const navigateOnceRef = useRef(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const result = getFreshResult(lastResult, attempt);
  const celebration: SectionCompletionEvent | null = result
    ? getSectionCompletionEvent(progressState, result.levelId)
    : null;
  const focusKey = result ? `result:${result.attemptId}` : `empty:${attempt ?? ""}`;

  useEffect(() => {
    if (!hydrated || focusedResultRef.current === focusKey) return;
    headingRef.current?.focus();
    focusedResultRef.current = focusKey;
  }, [focusKey, hydrated]);

  useEffect(() => {
    if (celebration) continueRef.current?.focus();
  }, [celebration]);

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

  const mission = getMissionById(result.levelId);
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
  // Derived from the one canonical list, so it cannot be shown twice or get out of step.
  const isFirstEverCompletion = progressState.completedLevelIds.length === 1;
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
    navigateOnceRef.current = true;
    router.push(getContinuePath(progressState, result.levelId));
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
        {t("title")}
      </h1>
      <p className={styles.levelIdentity}>{levelIdentity}</p>
      <p className={styles.text}>{t("description")}</p>

      {/*
       * How it went, and whether a record fell. Reading only the question and never the
       * outcome would leave a child who cannot read guessing at whether they did well.
       */}
      <Narrator
        lines={[
          t("title"),
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

      <LookAskCheck sequential states={{ look: "completed", ask: "completed", check: "completed" }} />

      {/*
        Offered once, after the very first mission: at that moment the player has something
        they would not want to lose, so the message lands instead of blocking the way in.
        It says where the medal is kept, and marks the account as not built yet rather
        than promising a button that does not exist.
      */}
      {isFirstEverCompletion && (
        <aside className={styles.keepsake}>
          <MascotSlot alt="" className={styles.keepsakeMascot} mood="encouraging" size={72} />
          <p className={styles.keepsakeText}>
            <span className={styles.keepsakeTitle}>{tStorage("roquiSaveTitle")}</span>
            {tStorage("roquiSaveHint")}
          </p>
          <Link className={styles.keepsakeAction} href="/guardian">
            {tGuardian("askAdult")}
          </Link>
        </aside>
      )}

      <div className={styles.actions}>
        <Link className={styles.primaryLink} href={getContinuePath(progressState, result.levelId)}>
          {t("continue")}
        </Link>
        <Link className={styles.secondaryLink} href={getReplayPath(result.levelId)}>
          {t("replay")}
        </Link>
        <Link className={styles.secondaryLink} href="/worlds">
          {t("returnToIslands")}
        </Link>
      </div>

      {celebration && (
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
    </section>
  );
}
