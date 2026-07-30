import { BookOpenCheck, MonitorOff } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LargeActionButton } from "@/components/LargeActionButton";
import { PageContainer } from "@/components/PageContainer";

export default async function TeacherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("teacher");

  return (
    <main id="main-content">
      <PageContainer className="placeholder-shell">
        <section className="page-intro" aria-labelledby="teacher-title">
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 id="teacher-title">{t("title")}</h1>
          <p>{t("description")}</p>
        </section>
        <div className="concept-grid">
          <article className="concept-card">
            <BookOpenCheck aria-hidden="true" size={31} />
            <h2>{t("onlineTitle")}</h2>
            <p>{t("onlineDescription")}</p>
          </article>
          <article className="concept-card">
            <MonitorOff aria-hidden="true" size={31} />
            <h2>{t("offlineTitle")}</h2>
            <p>{t("offlineDescription")}</p>
          </article>
        </div>
        <p className="privacy-note">{t("privacyNote")}</p>
        <LargeActionButton href="/">{t("backHome")}</LargeActionButton>
      </PageContainer>
    </main>
  );
}

