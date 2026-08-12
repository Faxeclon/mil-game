"use client";

import { Map } from "lucide-react";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/features/app/useHasMounted";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";

/**
 * The map link, offered only to somebody who plays.
 *
 * That is a child with a profile. A grown-up of either kind is left without it: a teacher
 * supervises a class and a parent watches how their children are doing, and neither came
 * here to earn medals. A grown-up's own game would be a second streak and a second rank
 * sitting on a device that already belongs to somebody who plays.
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
  if (account || !onboarded) return null;

  return (
    <Link aria-label={t("worlds")} className={className} href="/worlds">
      <Map aria-hidden="true" size={19} />
      <span>{t("worlds")}</span>
    </Link>
  );
}
