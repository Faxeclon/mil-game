import { getBestResult } from "@/features/progress/bestResults";
import type { ProgressState } from "@/features/progress/progressState";
import { isLevelCompleted } from "@/features/progress/progressState";
import { playableMissionOrder } from "@/features/levels/progressSummary";
import { getStarCount } from "@/features/scoring/levelScore";

/**
 * A rank and a title, both worked out from what the player actually did.
 *
 * Nothing here is stored. A rank is a conclusion, so it is recalculated every time from
 * the recorded best runs. Its scale is kept with the player's progress, so adding a
 * mission later cannot demote a rank earned from an earlier catalog.
 *
 * It is deliberately not a comparison with other children: there is no league and no
 * position. The only thing being measured is a player against their own map.
 */
export type RankTier = "bronze" | "silver" | "gold";

export type PlayerRank = {
  /** Stars earned across every completed mission, out of the stars on offer. */
  stars: number;
  maxStars: number;
  missionsCompleted: number;
  missionsPlayable: number;
  /** Share of the available stars, 0 to 100, whole. */
  percent: number;
  /** Null until the player has finished something: a rank must be earned, not handed out. */
  tier: RankTier | null;
  titleKey: TitleKey;
};

/** Three stars per mission is the ceiling, the same scale the results screen shows. */
export const STARS_PER_MISSION = 3;

/** Where one tier ends and the next begins, as a share of the stars on offer. */
export const RANK_THRESHOLDS: Readonly<Record<Exclude<RankTier, "bronze">, number>> = {
  silver: 40,
  gold: 75
};

/**
 * Titles grow with the stars earned, not with time spent, so a title always says
 * something true about how carefully the player has been looking.
 */
export const titleKeys = ["beginner", "curious", "detective", "expert", "master"] as const;

export type TitleKey = (typeof titleKeys)[number];

const TITLE_THRESHOLDS: readonly { key: TitleKey; stars: number }[] = [
  { key: "master", stars: 13 },
  { key: "expert", stars: 9 },
  { key: "detective", stars: 5 },
  { key: "curious", stars: 1 },
  { key: "beginner", stars: 0 }
];

export function getTitleForStars(stars: number): TitleKey {
  const safeStars = Number.isFinite(stars) ? Math.max(0, Math.trunc(stars)) : 0;
  return TITLE_THRESHOLDS.find((entry) => safeStars >= entry.stars)?.key ?? "beginner";
}

export function getTierForPercent(percent: number, missionsCompleted: number): RankTier | null {
  if (missionsCompleted <= 0) return null;
  if (percent >= RANK_THRESHOLDS.gold) return "gold";
  if (percent >= RANK_THRESHOLDS.silver) return "silver";
  return "bronze";
}

/** Stars a player has banked: the best run of each mission they have finished. */
export function countEarnedStars(state: ProgressState): number {
  return playableMissionOrder.reduce((total, mission) => {
    if (!isLevelCompleted(state, mission.id)) return total;
    const best = getBestResult(state.bestResultsByLevelId, mission.id);
    return total + (best ? getStarCount(best.score) : 0);
  }, 0);
}

export function getPlayerRank(state: ProgressState): PlayerRank {
  const missionsCompleted = playableMissionOrder.filter((mission) => isLevelCompleted(state, mission.id)).length;
  const missionsPlayable = Math.max(state.rankMissionCeiling, missionsCompleted);
  const stars = countEarnedStars(state);
  const maxStars = missionsPlayable * STARS_PER_MISSION;
  // A game with no playable missions has nothing to rank, and must not divide by zero.
  const percent = maxStars === 0 ? 0 : Math.round((stars / maxStars) * 100);

  return {
    stars,
    maxStars,
    missionsCompleted,
    missionsPlayable,
    percent,
    tier: getTierForPercent(percent, missionsCompleted),
    titleKey: getTitleForStars(stars)
  };
}

export type LocalStanding = {
  profileId: string;
  /** Null when the player has not chosen a nickname yet; the screen names them by number. */
  nickname: string | null;
  rank: PlayerRank;
};

/**
 * The standings between the players of this one phone.
 *
 * This is the only comparison the game makes, and it is between siblings sitting next to
 * each other, not against strangers on a server. Nothing is uploaded and nobody outside
 * the device appears here.
 */
export function getLocalStandings(
  profiles: readonly { id: string; progress: ProgressState }[]
): LocalStanding[] {
  return profiles
    .map((profile) => ({
      profileId: profile.id,
      nickname: profile.progress.localNickname,
      rank: getPlayerRank(profile.progress)
    }))
    .sort((a, b) => {
      if (b.rank.stars !== a.rank.stars) return b.rank.stars - a.rank.stars;
      if (b.rank.missionsCompleted !== a.rank.missionsCompleted) {
        return b.rank.missionsCompleted - a.rank.missionsCompleted;
      }
      // Everything else equal, the order they joined the phone: stable and unarbitrary.
      return a.profileId.localeCompare(b.profileId);
    });
}
