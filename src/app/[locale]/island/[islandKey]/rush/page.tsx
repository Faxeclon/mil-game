import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/PageContainer";
import { ProfileRouteGuard } from "@/components/ProfileRouteGuard";
import { RushClient } from "@/components/RushClient";
import { contentPacks, singlePacks } from "@/content/packs/packRegistry";
import { islands, type IslandKey } from "@/features/levels/levelModel";
import { buildIslandRushPool } from "@/features/rush/rushState";

type IslandRushPageProps = { params: Promise<{ locale: string; islandKey: string }> };

export function generateStaticParams() {
  return islands.map((island) => ({ islandKey: island.key }));
}

/**
 * The island's own challenge: its pictures again, this time against a clock.
 *
 * It lives inside the island rather than beside the map, because it is the last thing
 * you do there and not a second game. The pool is built from that island's packs alone.
 */
export default async function IslandRushPage({ params }: IslandRushPageProps) {
  const { locale, islandKey } = await params;
  setRequestLocale(locale);

  if (!islands.some((island) => island.key === islandKey)) notFound();
  const pool = buildIslandRushPool(islandKey as IslandKey, contentPacks, singlePacks);

  return (
    <main id="main-content">
      <PageContainer className="tutorial-shell tutorial-game-shell">
        <ProfileRouteGuard>
          <RushClient island={islandKey as IslandKey} pool={pool} />
        </ProfileRouteGuard>
      </PageContainer>
    </main>
  );
}
