import { getTranslations, setRequestLocale } from "next-intl/server";
import { TutorialClient } from "@/components/TutorialClient";
import { PageContainer } from "@/components/PageContainer";
import { introductoryTutorialPack } from "@/content/packs/introductoryTutorial";

export default async function TutorialPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await getTranslations("tutorial");
  return <main id="main-content"><PageContainer className="tutorial-shell tutorial-game-shell"><TutorialClient pack={introductoryTutorialPack} /></PageContainer></main>;
}
