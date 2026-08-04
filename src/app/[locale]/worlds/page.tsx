import { setRequestLocale } from "next-intl/server";
import { MissionMap } from "@/components/MissionMap";
import { PageContainer } from "@/components/PageContainer";

type WorldsPageProps = { params: Promise<{ locale: string }> };

export default async function WorldsPage({ params }: WorldsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer className="mission-map-page">
        <MissionMap />
      </PageContainer>
    </main>
  );
}
