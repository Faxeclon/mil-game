import { CheckCircle2, GraduationCap, HelpCircle, Search } from "lucide-react";
import { DetectiveScene } from "@/components/DetectiveScene";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LargeActionButton } from "@/components/LargeActionButton";
import { PageContainer } from "@/components/PageContainer";
import { Link } from "@/i18n/navigation";

type HomePageProps = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const steps = [
    { icon: Search, title: t("look"), color: "blue" },
    { icon: HelpCircle, title: t("ask"), color: "purple" },
    { icon: CheckCircle2, title: t("check"), color: "teal" }
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
            <section className="current-mission" aria-labelledby="current-mission-title">
              <p>{t("missionAvailable")}</p>
              <h2 id="current-mission-title">{t("currentMissionTitle")}</h2>
              <span>{t("currentMissionMeta")}</span>
            </section>
            <div className="home-actions">
              <LargeActionButton href="/tutorial">{t("start")}</LargeActionButton>
              <LargeActionButton href="/worlds" variant="secondary">{t("viewMissions")}</LargeActionButton>
            </div>
          </div>
          <DetectiveScene />
        </section>

        <section className="detective-tools" aria-labelledby="learning-title">
          <h2 id="learning-title">{t("learningTitle")}</h2>
          <ol className="learning-steps">
            {steps.map(({ icon: Icon, title, color }, index) => (
              <li className="learning-step" key={title}>
                <span className={`step-icon step-icon--${color}`} aria-hidden="true">
                  <Icon size={25} strokeWidth={2.5} />
                </span>
                <span><span className="step-number">{index + 1}</span><strong>{title}</strong></span>
              </li>
            ))}
          </ol>
          <Link className="home-teacher-link" href="/teacher"><GraduationCap aria-hidden="true" size={18} />{t("teacherLink")}</Link>
        </section>
      </PageContainer>
    </main>
  );
}
