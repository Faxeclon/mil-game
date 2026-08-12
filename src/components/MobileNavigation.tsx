"use client";

import { GraduationCap, Home, Map, QrCode, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/features/app/useHasMounted";
import { getAdultHome } from "@/features/adults/adultAccount";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link, usePathname } from "@/i18n/navigation";
import { AdultPlayLink } from "./AdultPlayLink";

/**
 * Primary navigation for small screens. Hidden during the tutorial game shell.
 *
 * Signing in as a grown-up adds a destination; it never removes one. The bar used to be
 * swapped wholesale for a teacher's own set, which meant a parent - a role it could not
 * see at all - was left with no bar whatsoever: no home, no islands, no options. Whoever
 * is holding the phone, everything that works for them is here at once.
 */
export function MobileNavigation() {
  const pathname = usePathname();
  const t = useTranslations("header");
  const tAdult = useTranslations("adult");
  const tCards = useTranslations("cards");
  const hasMounted = useHasMounted();
  const { hydrated, onboarded } = useProgress();
  const { hydrated: adultHydrated, account } = useAdultAccount();

  /*
   * An empty device has nowhere to navigate to.
   *
   * Until somebody exists here - a player with a profile or a grown-up who signed in -
   * every destination would either ask for one or be the page already on screen. A bar of
   * dead ends is worse than no bar, so there is no bar.
   */
  if (!hasMounted || !hydrated || !adultHydrated) return null;
  if (!onboarded && account === null) return null;

  const adultHome = getAdultHome(account);
  const destinations: { href: string; icon: LucideIcon; label: string }[] = [
    { href: "/", icon: Home, label: t("home") }
  ];

  const isTeacher = account?.role === "teacher";

  /*
   * A teacher gets the cards instead of the islands.
   *
   * Not because playing is forbidden - the map is still reachable from their own panel -
   * but because this bar is the one thing on screen while standing in front of a class,
   * and what they need there is the sheet of cards to print or the class to run. Sending
   * that tap to a child's game map was offering the wrong door in the only place where
   * there is no time to look for the right one.
   *
   * Everyone else keeps the map: a player, and a parent, for whom the game is exactly what
   * they came to look at.
   */
  if (isTeacher) {
    destinations.push({ href: "/teacher/cards", icon: QrCode, label: tCards("navLabel") });
  } else if (onboarded || account) {
    destinations.push({ href: "/worlds", icon: Map, label: t("worlds") });
  }

  if (account && adultHome) {
    destinations.push({
      href: adultHome,
      icon: account.role === "teacher" ? GraduationCap : Users,
      label: tAdult(`role.${account.role}`)
    });
  }

  destinations.push({ href: "/settings", icon: SlidersHorizontal, label: t("mobileOptions") });

  return (
    <nav aria-label={t("mobileNavigation")} className="mobile-bottom-nav">
      {/* How many doors there are is a fact about who is holding the phone, so it is
          carried here rather than fixed in the stylesheet. */}
      <div
        className="mobile-bottom-nav__inner"
        style={{ gridTemplateColumns: `repeat(${destinations.length}, minmax(0, 1fr))` }}
      >
        {destinations.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          if (href === "/worlds" && account) {
            return (
              <AdultPlayLink aria-label={label} className="mobile-bottom-nav__link" key={href}>
                <Icon aria-hidden="true" size={21} strokeWidth={2.4} />
                <span>{label}</span>
              </AdultPlayLink>
            );
          }
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
