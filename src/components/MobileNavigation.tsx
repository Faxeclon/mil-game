"use client";

import { GraduationCap, Home, Map, QrCode, SlidersHorizontal } from "lucide-react";
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
  const tCards = useTranslations("cards");
  const { hydrated, onboarded } = useProgress();
  const { hydrated: teacherHydrated, account } = useTeacherAccount();

  const isTeacherDevice = teacherHydrated && account !== null && hydrated && !onboarded;
  const destinations = isTeacherDevice
    ? [
        { href: "/", icon: GraduationCap, label: tTeacher("navLabel") },
        { href: "/teacher/cards", icon: QrCode, label: tCards("cardsLink") },
        { href: "/settings", icon: SlidersHorizontal, label: t("mobileOptions") }
      ]
    : playerDestinations.map((destination) => ({
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
