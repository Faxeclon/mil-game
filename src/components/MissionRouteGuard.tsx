"use client";

import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { isMissionUnlocked } from "@/features/levels/levelProgress";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
import styles from "./MissionRouteGuard.module.css";

/**
 * Blocks a mission the stored progress has not unlocked yet, so typing a URL by hand
 * cannot skip ahead. A locked attempt shows an explanation and a way back instead of an
 * error page or an empty screen.
 */
export function MissionRouteGuard({ missionId, children }: { missionId: string; children: ReactNode }) {
  const t = useTranslations("locked");
  const { hydrated, progressState } = useProgress();

  // Progress lives in the browser, so the answer is only trustworthy after hydration.
  if (!hydrated) return <LoadingRoqui message={t("checking")} />;

  if (!isMissionUnlocked(progressState, missionId)) {
    return (
      <section aria-labelledby="locked-title" className={`${styles.locked} app-chrome-hidden`}>
        <span aria-hidden="true" className={styles.icon}>
          <LockKeyhole size={26} />
        </span>
        <h1 className={styles.title} id="locked-title">
          {t("title")}
        </h1>
        <p className={styles.text}>{t("description")}</p>
        <Link className={styles.action} href="/worlds">
          {t("backToMap")}
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}
