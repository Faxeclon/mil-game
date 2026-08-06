import { setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/PageContainer";
import { RushClient } from "@/components/RushClient";
import { contentPacks, singlePacks } from "@/content/packs/packRegistry";
import { buildRushPool } from "@/features/rush/rushState";

type RushPageProps = { params: Promise<{ locale: string }> };

/** Every authored image can appear in a run; no new artwork is needed for this mode. */
const rushPool = buildRushPool(Object.values(contentPacks), Object.values(singlePacks));

export default async function RushPage({ params }: RushPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer className="tutorial-shell tutorial-game-shell">
        <RushClient pool={rushPool} />
      </PageContainer>
    </main>
  );
}
