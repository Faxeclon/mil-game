"use client";

import { BookOpenCheck, Home, Map, QrCode, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProgress } from "@/features/progress/ProgressProvider";
import { useTeacherAccount } from "@/features/teacher/teacherAccountStore";
import { Link, usePathname } from "@/i18n/navigation";

const playerDestinations = [
  { href: "/", icon: Home, labelKey: "home" },
  { href: "/worlds", icon: Map, labelKey: "worlds" },
  { href: "/settings", icon: SlidersHorizontal, labelKey: "mobileOptions" }
] as const;

/**
 * Primary navigation for small screens. Hidden during the tutorial game shell.
 *
 * What it offers depends on whose device this is. A teacher who registered here and has
 * no player on the phone gets their own destinations rather than a map they cannot open:
 * pointing a bar at the islands while the islands ask for a profile would be the app
 * arguing with itself.
 */
export function MobileNavigation() {
  const pathname = usePathname();
  const t = useTranslations("header");
  const tTeacher = useTranslations("teacherAccount");
  const { hydrated, onboarded } = useProgress();
  const { hydrated: teacherHydrated, account } = useTeacherAccount();

  /*
   * An empty device has nowhere to navigate to.
   *
   * Until somebody exists here - a player with a profile or a teacher who registered -
   * every destination would either ask for one or be the page already on screen. A bar
   * of dead ends is worse than no bar, so there is no bar.
   */
  if (!hydrated || !teacherHydrated) return null;
  if (!onboarded && account === null) return null;

  const isTeacherDevice = account !== null && !onboarded;
  const destinations = isTeacherDevice
    ? [
        { href: "/", icon: Home, label: t("home") },
        { href: "/teacher/cards", icon: QrCode, label: tTeacher("navCards") },
        { href: "/teacher", icon: BookOpenCheck, label: tTeacher("navGuide") },
        { href: "/settings", icon: SlidersHorizontal, label: t("mobileOptions") }
      ]
    : playerDestinations
        // Without a profile the map only asks for one, so the bar does not offer it.
        .filter((destination) => destination.href !== "/worlds" || (hydrated && onboarded))
        .map((destination) => ({
          href: destination.href,
          icon: destination.icon,
          label: t(destination.labelKey)
        }));

  return (
    <nav aria-label={t("mobileNavigation")} className="mobile-bottom-nav">
      <div className="mobile-bottom-nav__inner">
        {destinations.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={
                isActive ? "mobile-bottom-nav__link mobile-bottom-nav__link--active" : "mobile-bottom-nav__link"
              }
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" size={21} strokeWidth={2.4} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
