import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { IslandView } from "@/components/IslandView";
import { ChildExperienceRouteGuard } from "@/components/ChildExperienceRouteGuard";
import { PageContainer } from "@/components/PageContainer";
import { ProfileRouteGuard } from "@/components/ProfileRouteGuard";
import { islands, type IslandKey } from "@/features/levels/levelModel";

type IslandPageProps = { params: Promise<{ locale: string; islandKey: string }> };

export function generateStaticParams() {
  return islands.map((island) => ({ islandKey: island.key }));
}

export default async function IslandPage({ params }: IslandPageProps) {
  const { locale, islandKey } = await params;
  setRequestLocale(locale);

  if (!islands.some((island) => island.key === islandKey)) notFound();

  return (
    <main id="main-content">
      <PageContainer className="island-shell">
        <ChildExperienceRouteGuard>
          <ProfileRouteGuard>
            <IslandView island={islandKey as IslandKey} />
          </ProfileRouteGuard>
        </ChildExperienceRouteGuard>
      </PageContainer>
    </main>
  );
}
