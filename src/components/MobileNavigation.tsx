"use client";

import { Home, Map, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const destinations = [
  { href: "/", icon: Home, labelKey: "home" },
  { href: "/worlds", icon: Map, labelKey: "worlds" },
  { href: "/settings", icon: SlidersHorizontal, labelKey: "mobileOptions" }
] as const;

/** Primary child navigation for small screens. Hidden during the tutorial game shell. */
export function MobileNavigation() {
  const pathname = usePathname();
  const t = useTranslations("header");

  return (
    <nav aria-label={t("mobileNavigation")} className="mobile-bottom-nav">
      <div className="mobile-bottom-nav__inner">
        {destinations.map(({ href, icon: Icon, labelKey }) => {
          const isActive = pathname === href;
          return (
            <Link aria-current={isActive ? "page" : undefined} className={isActive ? "mobile-bottom-nav__link mobile-bottom-nav__link--active" : "mobile-bottom-nav__link"} href={href} key={href}>
              <Icon aria-hidden="true" size={21} strokeWidth={2.4} />
              <span>{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
