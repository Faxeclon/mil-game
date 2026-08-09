"use client";

import { Map } from "lucide-react";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/features/app/useHasMounted";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";

/**
 * The map link, offered once somebody on this device can actually open it.
 *
 * That is a player with a profile, or a grown-up who signed in - their address already is
 * a profile, so the islands are one tap away for them as well. Only an empty device is
 * left without the link, because there the map could do nothing but ask for a name.
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

  return (
    <Link aria-label={t("worlds")} className={className} href="/worlds">
      <Map aria-hidden="true" size={19} />
      <span>{t("worlds")}</span>
    </Link>
  );
}
