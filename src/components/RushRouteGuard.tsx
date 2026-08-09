"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { getActiveBonusForIsland } from "@/features/bonus/bonusOpportunity";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link, useRouter } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
import styles from "./MissionRouteGuard.module.css";

const RushCompletionRetention = createContext<((bonusId: string) => void) | null>(null);

/** Keeps the completed score visible in this mounted visit only; it never survives refresh. */
export function useRushCompletionRetention(): (bonusId: string) => void {
  const retain = useContext(RushCompletionRetention);
  if (!retain) throw new Error("useRushCompletionRetention must be used inside RushRouteGuard.");
  return retain;
}

/** Lets only the selected profile's active Bonus enter its matching island Rush route. */
export function RushRouteGuard({ island, children }: { island: string; children: ReactNode }) {
  const t = useTranslations("locked");
  const router = useRouter();
  const { hydrated, progressState, profiles } = useProgress();
  const activeBonus = getActiveBonusForIsland(progressState, island);
  const [admittedRun] = useState<{ bonusId: string; profileId: string | null } | null>(() =>
    activeBonus ? { bonusId: activeBonus.id, profileId: profiles.activeId } : null
  );
  const [completedBonusId, setCompletedBonusId] = useState<string | null>(null);

  const retainCompletedBonus = (bonusId: string) => {
    if (admittedRun?.bonusId === bonusId && admittedRun.profileId === profiles.activeId) {
      setCompletedBonusId(bonusId);
    }
  };

  const completedInThisVisit = Boolean(
    admittedRun &&
    admittedRun.profileId === profiles.activeId &&
    completedBonusId === admittedRun.bonusId &&
    progressState.bonusOpportunities.some(
      (bonus) => bonus.id === admittedRun.bonusId && bonus.status === "consumed"
    )
  );
  const permitted = Boolean(activeBonus || completedInThisVisit);

  useEffect(() => {
    if (hydrated && !permitted) router.replace(`/island/${island}`);
  }, [hydrated, island, permitted, router]);

  if (!hydrated) {
    return <LoadingRoqui message={t("checking")} title={t("title")} />;
  }

  if (!permitted) {
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

  return <RushCompletionRetention.Provider value={retainCompletedBonus}>{children}</RushCompletionRetention.Provider>;
}
