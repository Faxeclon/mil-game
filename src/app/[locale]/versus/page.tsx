import { setRequestLocale } from "next-intl/server";
import { PageContainer } from "@/components/PageContainer";
import { VersusClient } from "@/components/VersusClient";
import { contentPacks } from "@/content/packs/packRegistry";

type VersusPageProps = { params: Promise<{ locale: string }> };

/** Every authored round is fair game in a match, whatever mission it belongs to. */
const versusRounds = Object.values(contentPacks).flatMap((pack) => pack.rounds);

/**
 * Versus needs no progress, no account and no network, so it is a plain static route:
 * two children can open it on one phone with no signal and play straight away.
 */
export default async function VersusPage({ params }: VersusPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main id="main-content">
      <PageContainer className="tutorial-shell tutorial-game-shell">
        <VersusClient rounds={versusRounds} />
      </PageContainer>
    </main>
  );
}
