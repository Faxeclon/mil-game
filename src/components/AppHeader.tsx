import { Accessibility, Map } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function AppHeader({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "header" });
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label={t("home")}><span className="brand-mark">MD</span><span className="brand-label">{t("brand")}</span></Link>
          <nav aria-label={t("primaryNavigation")} className="header-nav">
            <Link href="/worlds" aria-label={t("worlds")}><Map aria-hidden="true" size={19} /><span>{t("worlds")}</span></Link>
            <Link href="/settings" aria-label={t("accessibility")}><Accessibility aria-hidden="true" size={19} /><span>{t("accessibility")}</span></Link>
          </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
