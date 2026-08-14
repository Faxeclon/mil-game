import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MissionIntro } from "@/components/MissionIntro";
import { ChildExperienceRouteGuard } from "@/components/ChildExperienceRouteGuard";
import { MissionRouteGuard } from "@/components/MissionRouteGuard";
import { PageContainer } from "@/components/PageContainer";
import { ProfileRouteGuard } from "@/components/ProfileRouteGuard";
import { DecisionClient } from "@/components/DecisionClient";
import { SingleImageClient } from "@/components/SingleImageClient";
import { TutorialClient } from "@/components/TutorialClient";
import { getContentPack, getDecisionPack, getSinglePack, hasContentPack } from "@/content/packs/packRegistry";
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

/*
 * The first mission that asks what to do rather than what something is.
 *
 * Read off the catalog instead of written down, so reordering that island cannot leave
 * its explanation attached to a mission in the middle of it.
 */
const FIRST_DECISION_MISSION_ID = missionBlueprint.find(
  (mission) => mission.mode === "decision" && mission.packId
)?.id;

export function generateStaticParams() {
  return missionBlueprint
    .filter((mission) => hasContentPack(mission.packId))
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
  const singlePack = getSinglePack(mission?.packId);
  const decisionPack = getDecisionPack(mission?.packId);
  if (!mission || (!pack && !singlePack && !decisionPack)) notFound();

  const t = await getTranslations("islands");
  const tutorial = await getTranslations("tutorial");
  const chipLabel = `${t(`categories.${mission.category}.title`)} · ${t("missionNumber", { number: mission.order })}`;
  const entryTitle = t(`modes.${mission.mode}`);
  const entryMeta =
    mission.mode === "single"
      ? tutorial("singleOriginFraming")
      : [
          t(`difficulty.${getLevelDifficulty(mission.mode)}`),
          isTimedMode(mission.mode) ? t("secondsPerRound", { seconds: mission.secondsPerRound ?? 0 }) : null
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <main id="main-content">
      <PageContainer className="tutorial-shell tutorial-game-shell">
        <ChildExperienceRouteGuard>
          <ProfileRouteGuard>
          <MissionRouteGuard missionId={mission.id}>
            {/* Roqui presents a new island or theme before its first mission opens. */}
            <MissionIntro missionId={mission.id}>
              {decisionPack ? (
                /* No entry card and no meta: a situation is the screen, and a card in
                   front of it would only delay the one thing there is to read. */
                <DecisionClient
                  chipLabel={chipLabel}
                  levelId={mission.id as LevelId}
                  pack={decisionPack}
                  showBriefing={mission.id === FIRST_DECISION_MISSION_ID}
                />
              ) : singlePack ? (
                <SingleImageClient
                  chipLabel={chipLabel}
                  entryMeta={entryMeta}
                  entryTitle={entryTitle}
                  levelId={mission.id as LevelId}
                  pack={singlePack}
                />
              ) : (
                <TutorialClient
                  chipLabel={chipLabel}
                  entryMeta={entryMeta}
                  entryTitle={entryTitle}
                  levelId={mission.id as LevelId}
                  pack={pack!}
                  secondsPerRound={mission.secondsPerRound}
                  showBriefing={mission.id === FIRST_MISSION_ID}
                />
              )}
            </MissionIntro>
          </MissionRouteGuard>
          </ProfileRouteGuard>
        </ChildExperienceRouteGuard>
      </PageContainer>
    </main>
  );
}
