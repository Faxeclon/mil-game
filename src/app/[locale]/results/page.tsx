import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export default async function ResultsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("placeholder");
  return <PlaceholderPage title={t("results.title")} description={t("results.description")} actionLabel={t("backHome")} href="/" />;
}

