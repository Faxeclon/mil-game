import { getTranslations, setRequestLocale } from "next-intl/server";
import { MissionMap } from "@/components/MissionMap";
import { PageContainer } from "@/components/PageContainer";
import { missionBlueprint } from "@/features/missions/missionMap";

type WorldsPageProps = { params: Promise<{ locale: string }> };

export default async function WorldsPage({ params }: WorldsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("worlds");
  const tHome = await getTranslations("home");

  const missions = missionBlueprint.map((mission, index) => {
    const title = t(`missions.${mission.key}.title`);
    const status = t(mission.state === "available" ? "available" : "comingSoon");
    return {
      ...mission,
      title,
      ariaLabel: t("nodeAria", { number: index + 1, title, status })
    };
  });

  return (
    <main id="main-content">
      <PageContainer className="mission-map-page">
        <MissionMap
          labels={{
            mapAria: t("pathAriaLabel"),
            greeting: t("title"),
            available: t("available"),
            comingSoon: t("comingSoon"),
            completed: t("completed"),
            play: tHome("start"),
            tip: t("mascotTip"),
            mascotAlt: tHome("mascotAlt")
          }}
          missions={missions}
        />
      </PageContainer>
    </main>
  );
}
