import { CheckCircle2, HelpCircle, Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LargeActionButton } from "@/components/LargeActionButton";
import { PageContainer } from "@/components/PageContainer";
import { appConfig } from "@/config/app";

type HomePageProps = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const steps = [
    { icon: Search, title: t("look"), color: "blue" },
    { icon: HelpCircle, title: t("ask"), color: "yellow" },
    { icon: CheckCircle2, title: t("check"), color: "mint" }
  ];

  return (
    <main id="main-content">
      <PageContainer className="home-shell">
        <section className="hero" aria-labelledby="home-title">
          <p className="eyebrow">{t("eyebrow")}</p>
          <p className="app-name">{appConfig.name}</p>
          <h1 id="home-title">{t("title")}</h1>
          <p className="hero-description">{t("description")}</p>
          <LargeActionButton href="/worlds">{t("start")}</LargeActionButton>
        </section>

        <section className="learning-card" aria-labelledby="learning-title">
          <h2 id="learning-title">{t("learningTitle")}</h2>
          <div className="learning-steps">
            {steps.map(({ icon: Icon, title, color }, index) => (
              <div className="learning-step" key={title}>
                <span className={`step-icon step-icon--${color}`} aria-hidden="true">
                  <Icon size={25} strokeWidth={2.5} />
                </span>
                <span className="step-number">{index + 1}</span>
                <strong>{title}</strong>
              </div>
            ))}
          </div>
          <p>{t("learningDescription")}</p>
        </section>
      </PageContainer>
    </main>
  );
}

