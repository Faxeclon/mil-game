import { setRequestLocale } from "next-intl/server";
import { MissionMap } from "@/components/MissionMap";
import { ChildExperienceRouteGuard } from "@/components/ChildExperienceRouteGuard";
import { IntroStoryGate } from "@/components/IntroStoryGate";
import { PageContainer } from "@/components/PageContainer";
import { ProfileRouteGuard } from "@/components/ProfileRouteGuard";

type WorldsPageProps = { params: Promise<{ locale: string }> };

export default async function WorldsPage({ params }: WorldsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer className="mission-map-page">
        <ChildExperienceRouteGuard>
          <ProfileRouteGuard>
            <IntroStoryGate>
              <MissionMap />
            </IntroStoryGate>
          </ProfileRouteGuard>
        </ChildExperienceRouteGuard>
      </PageContainer>
    </main>
  );
}
