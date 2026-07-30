import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("placeholder");
  return <PlaceholderPage title={t("settings.title")} description={t("settings.description")} actionLabel={t("backHome")} href="/" />;
}

