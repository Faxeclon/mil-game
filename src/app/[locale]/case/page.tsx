import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export default async function CasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("placeholder");

  return (
    <PlaceholderPage
      title={t("case.title")}
      description={t("case.description")}
      actionLabel={t("backToMissions")}
      href="/worlds"
    />
  );
}