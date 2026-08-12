"use client";

import type { ReactNode } from "react";
import { getAdultPlayName } from "@/features/adults/adultAccount";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link, useRouter } from "@/i18n/navigation";

type AdultPlayLinkProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
};

/**
 * The one door from a grown-up's tools into their own game.
 *
 * Opening an adult screen is deliberately only viewing. This control is the explicit
 * moment a grown-up asks to play, so it selects (or creates) their separate profile
 * before the map is allowed to open.
 */
export function AdultPlayLink({ children, className, "aria-label": ariaLabel }: AdultPlayLinkProps) {
  const router = useRouter();
  const { account } = useAdultAccount();
  const { startAdultPlay } = useProgress();
  const adultPlayName = getAdultPlayName(account);

  /*
   * Never for a teacher.
   *
   * Their whole role here is supervising: printing the cards, running the questions,
   * reading what the room got wrong. Playing a mission is a child's work, and a teacher's
   * own game would be a second set of medals and a streak on a device that belongs to a
   * class. Enforced in the one component every door goes through, so a link added
   * somewhere else later cannot quietly reopen it.
   */
  if (account?.role === "teacher") return null;

  if (!account || !adultPlayName) {
    return (
      <Link aria-label={ariaLabel} className={className} href="/worlds">
        {children}
      </Link>
    );
  }

  return (
    <button
      aria-label={ariaLabel}
      className={className}
      type="button"
      onClick={() => {
        if (startAdultPlay(account.email, adultPlayName)) router.push("/worlds");
      }}
    >
      {children}
    </button>
  );
}
