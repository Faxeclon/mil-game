"use client";

import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { isIslandRushUnlocked } from "@/features/levels/progressSummary";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
import styles from "./MissionRouteGuard.module.css";

/** Prevents an island challenge from being opened by a direct URL before its path is complete. */
export function RushRouteGuard({ island, children }: { island: string; children: ReactNode }) {
  const t = useTranslations("locked");
  const { hydrated, progressState } = useProgress();

  if (!hydrated) {
    return <LoadingRoqui message={t("checking")} title={t("title")} />;
  }

  if (!isIslandRushUnlocked(progressState, island)) {
    return (
      <section aria-labelledby="locked-title" className={`${styles.locked} app-chrome-hidden`}>
        <span aria-hidden="true" className={styles.icon}>
          <LockKeyhole size={26} />
        </span>
        <h1 className={styles.title} id="locked-title">
          {t("title")}
        </h1>
        <p className={styles.text}>{t("description")}</p>
        <Link className={styles.action} href={`/island/${island}`}>
          {t("backToMap")}
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}
