"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { LookAskCheck } from "@/components/LookAskCheck";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import { getNextMission } from "@/features/levels/levelProgress";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./MissionResults.module.css";

/** Long enough to enjoy the celebration, short enough not to feel stuck. */
const AUTO_ADVANCE_MS = 4500;

/**
 * Shows the attempt the player just finished, read from the shared progress. Reaching
 * this page without having played, or refreshing it, is a normal state, not an error.
 *
 * The screen returns to the map on its own so a child never has to find a button, and
 * the first touch or key press cancels that, in case they want to replay instead.
 */
export function MissionResults() {
  const t = useTranslations("results");
  const tIslands = useTranslations("islands");
  const tHome = useTranslations("home");
  const router = useRouter();
  const { hydrated, lastResult, progressState } = useProgress();
  const [autoAdvance, setAutoAdvance] = useState(true);

  const canAutoAdvance = hydrated && Boolean(lastResult) && autoAdvance;

  useEffect(() => {
    if (!canAutoAdvance) return;
    const timer = setTimeout(() => router.replace("/worlds"), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [canAutoAdvance, router]);

  if (!hydrated) {
    return (
      <p className={`${styles.loading} app-chrome-hidden`} role="status">
        {t("loading")}
      </p>
    );
  }

  if (!lastResult) {
    return (
      <section aria-labelledby="results-title" className={`${styles.empty} app-chrome-hidden`}>
        <h1 className={styles.emptyTitle} id="results-title">
          {t("emptyTitle")}
        </h1>
        <p className={styles.emptyText}>{t("emptyDescription")}</p>
        <Link className={styles.primaryLink} href="/worlds">
          {t("goToMap")}
        </Link>
      </section>
    );
  }

  const nextMission = getNextMission(progressState);

  const cancelAutoAdvance = () => setAutoAdvance(false);

  return (
    <section
      aria-labelledby="results-title"
      className={`${styles.results} app-chrome-hidden`}
      onKeyDown={cancelAutoAdvance}
      onPointerDown={cancelAutoAdvance}
    >
      <span className={styles.badge}>
        <MascotSlot alt={tHome("mascotAlt")} className={styles.mascot} mood="celebrating" priority />
        <span aria-hidden="true" className={`${styles.spark} ${styles.sparkOne}`} />
        <span aria-hidden="true" className={`${styles.spark} ${styles.sparkTwo}`} />
        <span aria-hidden="true" className={`${styles.spark} ${styles.sparkThree}`} />
      </span>

      <h1 className={styles.title} id="results-title">
        {t("title")}
      </h1>
      <p className={styles.text}>{t("description")}</p>

      <p className={styles.score}>
        {t("score", { correct: lastResult.correctRounds, total: lastResult.totalRounds })}
      </p>

      <LookAskCheck sequential states={{ look: "completed", ask: "completed", check: "completed" }} />

      {nextMission ? (
        <p className={styles.nextMission}>
          <span className={styles.nextMissionFlag}>
            <Sparkles aria-hidden="true" size={13} />
            {t("nextUnlocked")}
          </span>
          <span className={styles.nextMissionTitle}>
            {tIslands(`categories.${nextMission.category}.title`)}
          </span>
        </p>
      ) : (
        <p className={styles.nextMission}>
          <span className={styles.nextMissionTitle}>{t("allDone")}</span>
        </p>
      )}

      <div className={styles.actions}>
        {nextMission ? (
          <Link className={styles.primaryLink} href={`/level/${nextMission.id}`}>
            {t("continueNext")}
          </Link>
        ) : null}
        <Link className={styles.secondaryLink} href="/worlds">
          {t("backToMap")}
        </Link>
      </div>

      {autoAdvance && (
        <p className={styles.autoAdvance} role="status">
          <span aria-hidden="true" className={styles.autoAdvanceBar}>
            <span className={styles.autoAdvanceFill} />
          </span>
          {t("autoAdvance")}
        </p>
      )}
    </section>
  );
}
