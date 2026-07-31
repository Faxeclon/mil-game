import { CheckCircle2, HelpCircle, Search } from "lucide-react";
import { DetectiveScene } from "@/components/DetectiveScene";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LargeActionButton } from "@/components/LargeActionButton";
import { PageContainer } from "@/components/PageContainer";

type HomePageProps = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const steps = [
    { icon: Search, title: t("look"), description: t("lookDescription"), color: "blue" },
    { icon: HelpCircle, title: t("ask"), description: t("askDescription"), color: "purple" },
    { icon: CheckCircle2, title: t("check"), description: t("checkDescription"), color: "teal" }
  ];

  return (
    <main id="main-content">
      <PageContainer className="home-shell">
        <section className="home-mission-hero" aria-labelledby="home-title">
          <div className="home-mission-hero__content">
            <p className="eyebrow">{t("eyebrow")}</p>
            <p className="app-name">{t("productTitle")}</p>
            <h1 id="home-title">{t("title")}</h1>
            <p className="hero-description">{t("description")}</p>
            <div className="home-actions">
              <LargeActionButton href="/tutorial">{t("start")}</LargeActionButton>
              <LargeActionButton href="/worlds" variant="secondary">{t("viewMissions")}</LargeActionButton>
            </div>
          </div>
          <DetectiveScene />
        </section>

        <section className="detective-tools" aria-labelledby="learning-title">
          <h2 id="learning-title">{t("learningTitle")}</h2>
          <div className="learning-steps">
            {steps.map(({ icon: Icon, title, description, color }, index) => (
              <div className="learning-step" key={title}>
                <span className={`step-icon step-icon--${color}`} aria-hidden="true">
                  <Icon size={25} strokeWidth={2.5} />
                </span>
                <div><span className="step-number">{index + 1}</span><strong>{title}</strong><p>{description}</p></div>
              </div>
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
