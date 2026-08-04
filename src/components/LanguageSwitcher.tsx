"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getLocaleSwitchPath } from "@/i18n/localeSwitchPath";
import { Link, usePathname } from "@/i18n/navigation";
import styles from "./LanguageSwitcher.module.css";

/** Two-state toggle: the current language is filled, the other one is the target. */
export function LanguageSwitcher() {
  return (
    <Suspense fallback={null}>
      <LanguageSwitcherLink />
    </Suspense>
  );
}

function LanguageSwitcherLink() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("language");
  const nextLocale = locale === "es" ? "en" : "es";

  return (
    <Link
      aria-label={t("switchTo")}
      className={styles.language}
      href={getLocaleSwitchPath(pathname, searchParams)}
      locale={nextLocale}
    >
      <span
        aria-hidden="true"
        className={`${styles.languageOption} ${locale === "es" ? styles.languageActive : ""}`}
      >
        es
      </span>
      <span
        aria-hidden="true"
        className={`${styles.languageOption} ${locale === "en" ? styles.languageActive : ""}`}
      >
        en
      </span>
    </Link>
  );
}
