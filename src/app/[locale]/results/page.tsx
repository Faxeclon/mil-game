import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { MissionResults } from "@/components/MissionResults";
import { ChildExperienceRouteGuard } from "@/components/ChildExperienceRouteGuard";
import { PageContainer } from "@/components/PageContainer";
import { ProfileRouteGuard } from "@/components/ProfileRouteGuard";

export default async function ResultsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer className="results-shell">
        <ChildExperienceRouteGuard>
          <ProfileRouteGuard>
            <Suspense fallback={null}>
              <MissionResults />
            </Suspense>
          </ProfileRouteGuard>
        </ChildExperienceRouteGuard>
      </PageContainer>
    </main>
  );
}
