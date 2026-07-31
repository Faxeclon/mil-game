import { getTranslations, setRequestLocale } from "next-intl/server";
import { MissionNode, type MissionKind, type MissionState } from "@/components/MissionNode";
import { PageContainer } from "@/components/PageContainer";

type WorldsPageProps = { params: Promise<{ locale: string }> };

const missions: { key: MissionKind; state: MissionState }[] = [
  { key: "training", state: "available" },
  { key: "source", state: "locked" },
  { key: "context", state: "locked" },
  { key: "voices", state: "locked" },
  { key: "videos", state: "locked" },
  { key: "share", state: "locked" }
];

export default async function WorldsPage({ params }: WorldsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("worlds");

  return (
    <main id="main-content">
      <PageContainer className="journey-page">
        <section className="page-intro" aria-labelledby="worlds-title">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 id="worlds-title">{t("title")}</h1>
          <p>{t("description")}</p>
          <p className="journey-hint">{t("journeyHint")}</p>
        </section>
        <div className="journey-decor journey-decor--one" aria-hidden="true" />
        <div className="journey-decor journey-decor--two" aria-hidden="true" />
        <ol className="mission-journey" aria-label={t("pathAriaLabel")}>
          {missions.map(({ key, state }, index) => (
            <li className="mission-journey__item" key={key}>
              <span className="mission-journey__marker" aria-hidden="true">{index + 1}</span>
              <MissionNode
                number={index + 1}
                kind={key}
                title={t(`missions.${key}.title`)}
                description={t(`missions.${key}.description`)}
                state={state}
                availableLabel={t("available")}
                comingSoonLabel={t("comingSoon")}
                actionLabel={t("startTraining")}
                side={index % 2 === 0 ? "left" : "right"}
              />
            </li>
          ))}
        </ol>
      </PageContainer>
    </main>
  );
}
