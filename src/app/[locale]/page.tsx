import { setRequestLocale } from "next-intl/server";
import { HomeLanding } from "@/components/HomeLanding";
import { PageContainer } from "@/components/PageContainer";

type HomePageProps = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer className="home-shell">
        <HomeLanding />
      </PageContainer>
    </main>
  );
}
