"use client";

import { GraduationCap, Home, Map, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
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

  /*
   * The map is offered to a player, and to any grown-up who signed in. For a grown-up,
   * that explicit navigation selects their own profile before opening the islands. Only a
   * device with nobody on it is refused, and there the map could only ask for a name.
   */
  if (onboarded || account) destinations.push({ href: "/worlds", icon: Map, label: t("worlds") });

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
