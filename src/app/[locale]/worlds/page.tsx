import { getTranslations, setRequestLocale } from "next-intl/server";
import { MissionMap } from "@/components/MissionMap";
import { PageContainer } from "@/components/PageContainer";
import { missionBlueprint } from "@/features/missions/missionMap";

type WorldsPageProps = { params: Promise<{ locale: string }> };

export default async function WorldsPage({ params }: WorldsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("worlds");
  const missions = missionBlueprint.map((mission, index) => {
    const title = t(`missions.${mission.key}.title`);
    const status = t(mission.state === "available" ? "available" : "comingSoon");
    return {
      ...mission,
      title,
      description: t(`missions.${mission.key}.description`),
      ariaLabel: t("nodeAria", { number: index + 1, title, status })
    };
  });

  return (
    <main id="main-content">
      <PageContainer className="mission-map-page">
        <section className="page-intro" aria-labelledby="worlds-title">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 id="worlds-title">{t("title")}</h1>
          <p>{t("description")}</p>
        </section>
        <MissionMap
          labels={{
            mapAria: t("pathAriaLabel"),
            detailsTitle: t("detailsTitle"),
            available: t("available"),
            comingSoon: t("comingSoon"),
            completed: t("completed"),
            trainingMeta: t("trainingMeta"),
            startTraining: t("startTraining"),
            startShort: t("startShort"),
            expandDetails: t("expandDetails"),
            collapseDetails: t("collapseDetails")
          }}
          missions={missions}
        />
      </PageContainer>
    </main>
  );
}
