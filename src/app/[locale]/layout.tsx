import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/AppHeader";
import { MobileNavigation } from "@/components/MobileNavigation";
import { OfflineReadiness } from "@/features/offline/OfflineReadiness";
import { ProgressProvider } from "@/features/progress/ProgressProvider";
import { routing, type AppLocale } from "@/i18n/routing";

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

/**
 * Rounded, friendly and heavy enough for the large headings this game uses.
 * next/font self-hosts the files at build time, so nothing is fetched at runtime.
 */
const gameFont = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-game",
  display: "swap"
});

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("title"), description: t("description") };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "accessibility" });

  return (
    <html className={gameFont.variable} lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ProgressProvider>
            {/* Prepares the game to open with no signal, from the very first visit. */}
            <OfflineReadiness />
            <a className="skip-link" href="#main-content">{t("skipToContent")}</a>
            <AppHeader locale={locale as AppLocale} />
            {children}
            <MobileNavigation />
          </ProgressProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
