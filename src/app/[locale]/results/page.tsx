import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { MissionResults } from "@/components/MissionResults";
import { PageContainer } from "@/components/PageContainer";

export default async function ResultsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer className="results-shell">
        <Suspense fallback={null}>
          <MissionResults />
        </Suspense>
      </PageContainer>
    </main>
  );
}
