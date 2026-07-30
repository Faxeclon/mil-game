import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export default async function TutorialPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("placeholder");
  return <PlaceholderPage title={t("tutorial.title")} description={t("tutorial.description")} actionLabel={t("backToMissions")} href="/worlds" />;
}

