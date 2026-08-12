"use client";

import { Map } from "lucide-react";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/features/app/useHasMounted";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";
import { AdultPlayLink } from "./AdultPlayLink";

/**
 * The map link, offered once somebody on this device can actually open it.
 *
 * That is a player with a profile, or a grown-up who signed in. A grown-up's explicit map
 * action first selects their own profile; only an empty device is left without the link,
 * because there the map could do nothing but ask for a name.
 *
 * It renders nothing until the stored progress is known, which also keeps the server
 * markup identical for every visitor.
 */
export function IslandsNavLink({ className }: { className?: string }) {
  const t = useTranslations("header");
  const hasMounted = useHasMounted();
  const { hydrated, onboarded } = useProgress();
  const { hydrated: adultHydrated, account } = useAdultAccount();

  if (!hasMounted || !hydrated || !adultHydrated) return null;
  if (!onboarded && !account) return null;
  /*
   * Not for a teacher.
   *
   * Their work is the class - printing the cards, running the questions, reading what the
   * room got wrong - and the map is a child's game. Leaving it in the header put the one
   * door they never use next to the ones they do, in the bar that is always on screen.
   * Parents keep it: trying the game is the shortest way to understand what their child is
   * doing.
   */
  if (account?.role === "teacher") return null;

  const mapLink = (
    <Link aria-label={t("worlds")} className={className} href="/worlds">
      <Map aria-hidden="true" size={19} />
      <span>{t("worlds")}</span>
    </Link>
  );

  if (!account) return mapLink;

  return (
    <AdultPlayLink aria-label={t("worlds")} className={className}>
      <Map aria-hidden="true" size={19} />
      <span>{t("worlds")}</span>
    </AdultPlayLink>
  );
}
