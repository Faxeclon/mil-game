import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MissionRouteGuard } from "@/components/MissionRouteGuard";
import { PageContainer } from "@/components/PageContainer";
import { TutorialClient } from "@/components/TutorialClient";
import { getContentPack } from "@/content/packs/packRegistry";
import {
  getLevelDifficulty,
  getMissionById,
  isTimedMode,
  missionBlueprint,
  type LevelId
} from "@/features/levels/levelModel";

type LevelPageProps = { params: Promise<{ locale: string; levelId: string }> };

/** The one mission that introduces the game before it starts. */
const FIRST_MISSION_ID = "basics-1";

export function generateStaticParams() {
  return missionBlueprint
    .filter((mission) => Boolean(getContentPack(mission.packId)))
    .map((mission) => ({ levelId: mission.id }));
}

/**
 * One route for every mission. The blueprint decides which mode is played and what it
 * adds, so a new mission needs a data entry and a content pack, not a new page.
 */
export default async function LevelPage({ params }: LevelPageProps) {
  const { locale, levelId } = await params;
  setRequestLocale(locale);

  const mission = getMissionById(levelId);
  // A mission is playable only when its declared pack actually exists, so a typo in the
  // blueprint shows up as a missing route rather than as somebody else's rounds.
  const pack = getContentPack(mission?.packId);
  if (!mission || !pack) notFound();

  const t = await getTranslations("islands");
  const chipLabel = `${t(`categories.${mission.category}.title`)} · ${t("missionNumber", { number: mission.order })}`;
  const entryTitle = t(`modes.${mission.mode}`);
  const entryMeta = [
    t(`difficulty.${getLevelDifficulty(mission.mode)}`),
    isTimedMode(mission.mode) ? t("secondsPerRound", { seconds: mission.secondsPerRound ?? 0 }) : null
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main id="main-content">
      <PageContainer className="tutorial-shell tutorial-game-shell">
        <MissionRouteGuard missionId={mission.id}>
          <TutorialClient
            chipLabel={chipLabel}
            entryMeta={entryMeta}
            entryTitle={entryTitle}
            levelId={mission.id as LevelId}
            pack={pack}
            secondsPerRound={mission.secondsPerRound}
            showBriefing={mission.id === FIRST_MISSION_ID}
          />
        </MissionRouteGuard>
      </PageContainer>
    </main>
  );
}
