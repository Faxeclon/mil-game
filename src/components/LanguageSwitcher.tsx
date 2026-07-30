"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("language");
  const nextLocale = locale === "es" ? "en" : "es";

  return (
    <Link className="language-switcher" href={pathname} locale={nextLocale} aria-label={t("switchTo")}>
      <Languages aria-hidden="true" size={20} />
      <span>{nextLocale === "es" ? t("spanish") : t("english")}</span>
    </Link>
  );
}

