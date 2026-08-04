import { setRequestLocale } from "next-intl/server";
import { MissionResults } from "@/components/MissionResults";
import { PageContainer } from "@/components/PageContainer";

type ResultsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ attempt?: string | string[] }>;
};

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const { locale } = await params;
  const { attempt } = await searchParams;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer className="results-shell">
        <MissionResults attempt={typeof attempt === "string" ? attempt : undefined} />
      </PageContainer>
    </main>
  );
}
