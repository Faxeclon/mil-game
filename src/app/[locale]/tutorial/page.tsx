import { getTranslations, setRequestLocale } from "next-intl/server";
import { MissionRouteGuard } from "@/components/MissionRouteGuard";
import { ProfileRouteGuard } from "@/components/ProfileRouteGuard";
import { TutorialClient } from "@/components/TutorialClient";
import { PageContainer } from "@/components/PageContainer";
import { introductoryTutorialPack } from "@/content/packs/packRegistry";

/** Kept as a friendly alias for the very first mission of the game. */
export default async function TutorialPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("islands");

  return (
    <main id="main-content">
      <PageContainer className="tutorial-shell tutorial-game-shell">
        <ProfileRouteGuard>
          <MissionRouteGuard missionId="basics-1">
            <TutorialClient
              chipLabel={t("missionNumber", { number: 1 })}
              entryMeta={t("difficulty.easy")}
              entryTitle={t("modes.compare")}
              levelId="basics-1"
              pack={introductoryTutorialPack}
              showBriefing
            />
          </MissionRouteGuard>
        </ProfileRouteGuard>
      </PageContainer>
    </main>
  );
}
