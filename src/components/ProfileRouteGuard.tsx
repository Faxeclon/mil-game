"use client";

import type { ReactNode } from "react";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { needsLocalNicknameCompletion } from "@/features/progress/progressState";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";
import styles from "./ProfileRouteGuard.module.css";

/**
 * Keeps the map behind the profile, so typing a URL cannot land a player in a game that
 * has nobody to play it.
 *
 * This is not a login and there is nothing to sign into: it only checks that somebody on
 * this device has picked an apprentice and a nickname. Without that there is no progress
 * to draw, no medals to show and nowhere to save a result.
 */
export function ProfileRouteGuard({ children }: { children: ReactNode }) {
  const t = useTranslations("home");
  const tLocked = useTranslations("locked");
  const { hydrated, onboarded, progressState } = useProgress();

  // Progress lives in the browser, so the answer is only trustworthy after hydration.
  if (!hydrated) {
    return (
      <p className={`${styles.loading} app-chrome-hidden`} role="status">
        {tLocked("checking")}
      </p>
    );
  }

  if (!onboarded || needsLocalNicknameCompletion(progressState)) {
    return (
      <section aria-labelledby="profile-guard-title" className={styles.guard}>
        <span className={styles.mark}>
          <UserPlus aria-hidden="true" size={26} />
        </span>
        <h1 className={styles.title} id="profile-guard-title">
          {t("profileTitle")}
        </h1>
        <p className={styles.text}>{t("profileLocalNote")}</p>
        <Link className={styles.action} href="/">
          {t("profileSubmit")}
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}
