"use client";

import { Map } from "lucide-react";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/features/app/useHasMounted";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";

/**
 * The map link, offered only once somebody on this device can actually open it.
 *
 * Without a profile the islands ask for one, so showing the link would be inviting a tap
 * that only leads to a refusal. It renders nothing until the stored progress is known,
 * which also keeps the server markup identical for every visitor.
 */
export function IslandsNavLink({ className }: { className?: string }) {
  const t = useTranslations("header");
  const hasMounted = useHasMounted();
  const { hydrated, onboarded } = useProgress();

  if (!hasMounted || !hydrated || !onboarded) return null;

  return (
    <Link aria-label={t("worlds")} className={className} href="/worlds">
      <Map aria-hidden="true" size={19} />
      <span>{t("worlds")}</span>
    </Link>
  );
}
