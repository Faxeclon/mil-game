"use client";

import { useEffect, type ReactNode } from "react";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAdultPlayName } from "@/features/adults/adultAccount";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { getProfileRouteAccess } from "@/features/profiles/profileRouteAccess";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
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
  const { hydrated, onboarded, progressState, startAdultPlay } = useProgress();
  const { hydrated: adultHydrated, account } = useAdultAccount();
  const adultPlayName = getAdultPlayName(account);

  // Progress lives in the browser, so the answer is only trustworthy after hydration.
  const access = getProfileRouteAccess(hydrated, onboarded, progressState);
  const opensForAdult = access === "denied" && adultHydrated && account !== null && adultPlayName !== null;

  /*
   * A grown-up who signed in is not missing a profile: their address already is one.
   *
   * So the islands simply open. Stopping them at a button first would be asking them to
   * confirm something they said when they signed in, and a form asking for a nickname and
   * an apprentice would be asking it a second time in a child's words.
   */
  useEffect(() => {
    if (opensForAdult && account && adultPlayName) startAdultPlay(account.email, adultPlayName);
  }, [opensForAdult, account, adultPlayName, startAdultPlay]);

  if (access === "checking" || !adultHydrated) {
    return <LoadingRoqui message={tLocked("checking")} title={t("profileTitle")} />;
  }

  // The grown-up's game is being opened for them; nothing to show but the wait.
  if (opensForAdult) {
    return <LoadingRoqui message={tLocked("checking")} title={t("profileTitle")} />;
  }

  if (access === "denied") {
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
