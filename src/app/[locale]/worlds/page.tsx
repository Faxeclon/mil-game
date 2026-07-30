import { getTranslations, setRequestLocale } from "next-intl/server";
import { MissionCard } from "@/components/MissionCard";
import { PageContainer } from "@/components/PageContainer";

type WorldsPageProps = { params: Promise<{ locale: string }> };

const missionKeys = ["training", "source", "context", "voices", "videos", "share"] as const;

export default async function WorldsPage({ params }: WorldsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("worlds");

  return (
    <main id="main-content">
      <PageContainer>
        <section className="page-intro" aria-labelledby="worlds-title">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 id="worlds-title">{t("title")}</h1>
          <p>{t("description")}</p>
        </section>
        <ol className="mission-grid" aria-label={t("title")}>
          {missionKeys.map((key, index) => (
            <li key={key}>
              <MissionCard
                number={index + 1}
                title={t(`missions.${key}.title`)}
                description={t(`missions.${key}.description`)}
                available={key === "training"}
                availableLabel={t("available")}
                comingSoonLabel={t("comingSoon")}
                actionLabel={t("startTraining")}
              />
            </li>
          ))}
        </ol>
      </PageContainer>
    </main>
  );
}

