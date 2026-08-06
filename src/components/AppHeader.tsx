import { Accessibility } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { IslandsNavLink } from "@/components/IslandsNavLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TeacherNavLink } from "@/components/TeacherNavLink";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import styles from "./AppHeader.module.css";

export async function AppHeader({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "header" });
  const tHome = await getTranslations({ locale, namespace: "home" });

  return (
    /* "app-header" is only a hook for the existing global rule that hides the bar
       during a tutorial round; all styling lives in the module. */
    <header className={`${styles.header} app-header`}>
      <div className={styles.inner}>
        <Link aria-label={t("home")} className={styles.brand} href="/">
          <MascotSlot alt="" className={styles.brandMark} mood="welcoming" size={96} />
          <span className={styles.brandName}>{tHome("productTitle")}</span>
        </Link>

        <nav aria-label={t("primaryNavigation")} className={styles.nav}>
          {/* Appears once a profile exists; without one the map only asks for it. */}
          <IslandsNavLink className={styles.navLink} />
          <Link aria-label={t("accessibility")} className={styles.navLink} href="/settings">
            <Accessibility aria-hidden="true" size={19} />
            <span>{t("accessibility")}</span>
          </Link>
          {/* Appears only where a teacher registered; a child never meets it. */}
          <TeacherNavLink className={styles.navLink} />
        </nav>

        <LanguageSwitcher />
      </div>
    </header>
  );
}
