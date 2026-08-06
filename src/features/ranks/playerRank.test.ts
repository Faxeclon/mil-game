import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { updateBestResults } from "@/features/progress/bestResults";
import { initialProgressState, type ProgressState } from "@/features/progress/progressState";
import { playableMissionOrder } from "@/features/levels/progressSummary";
import {
  countEarnedStars,
  getLocalStandings,
  getPlayerRank,
  getTierForPercent,
  getTitleForStars,
  titleKeys
} from "./playerRank";

/** A player who finished the first `count` missions, each with the given score. */
function playerWith(count: number, score: number): ProgressState {
  const missions = playableMissionOrder.slice(0, count);
  return missions.reduce<ProgressState>(
    (state, mission) => ({
      ...state,
      completedLevelIds: [...state.completedLevelIds, mission.id as never],
      bestResultsByLevelId: updateBestResults(state.bestResultsByLevelId, mission.id as never, {
        score,
        correctRounds: 3,
        totalRounds: 3,
        elapsedMs: 9_000,
        attemptId: `attempt_${mission.id}-0000-0000-0000-000000000000`,
        completedAt: "2026-08-05T12:00:00.000Z"
      })
    }),
    initialProgressState
  );
}

describe("counting the stars a player has banked", () => {
  it("counts nothing before anything is finished", () => {
    expect(countEarnedStars(initialProgressState)).toBe(0);
  });

  it("counts the stars of the best run of each finished mission", () => {
    // 900 points is three stars, so two missions are worth six.
    expect(countEarnedStars(playerWith(2, 900))).toBe(6);
    expect(countEarnedStars(playerWith(2, 500))).toBe(2);
  });

  it("ignores a record for a mission that was never completed", () => {
    const state = {
      ...initialProgressState,
      bestResultsByLevelId: updateBestResults({}, "basics-1", {
        score: 1_000,
        correctRounds: 3,
        totalRounds: 3,
        elapsedMs: 1_000,
        attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
        completedAt: "2026-08-05T12:00:00.000Z"
      })
    };

    expect(countEarnedStars(state)).toBe(0);
  });
});

describe("the rank a player has earned", () => {
  it("gives no rank at all until something is finished", () => {
    const rank = getPlayerRank(initialProgressState);

    expect(rank.tier).toBeNull();
    expect(rank.stars).toBe(0);
    expect(rank.percent).toBe(0);
  });

  it("climbs from bronze to gold with the share of stars earned", () => {
    expect(getTierForPercent(0, 1)).toBe("bronze");
    expect(getTierForPercent(39, 1)).toBe("bronze");
    expect(getTierForPercent(40, 1)).toBe("silver");
    expect(getTierForPercent(74, 1)).toBe("silver");
    expect(getTierForPercent(75, 1)).toBe("gold");
    expect(getTierForPercent(100, 1)).toBe("gold");
  });

  it("never hands a rank to a player who has finished nothing", () => {
    expect(getTierForPercent(100, 0)).toBeNull();
  });

  it("reaches the top only by three-starring every playable mission", () => {
    const everything = getPlayerRank(playerWith(playableMissionOrder.length, 1_000));

    expect(everything.stars).toBe(everything.maxStars);
    expect(everything.percent).toBe(100);
    expect(everything.tier).toBe("gold");
  });

  it("stays bronze for a player who finished missions poorly", () => {
    const rank = getPlayerRank(playerWith(2, 420));

    expect(rank.missionsCompleted).toBe(2);
    expect(rank.tier).toBe("bronze");
  });

  it("is recalculated, never stored, so it cannot disagree with the map", () => {
    const state = playerWith(2, 900);

    expect("rank" in state).toBe(false);
    expect("tier" in state).toBe(false);
    expect(getPlayerRank(state)).toEqual(getPlayerRank(state));
  });
});

describe("the title that comes with the stars", () => {
  it("starts at the beginner title and grows with the stars", () => {
    expect(getTitleForStars(0)).toBe("beginner");
    expect(getTitleForStars(1)).toBe("curious");
    expect(getTitleForStars(5)).toBe("detective");
    expect(getTitleForStars(9)).toBe("expert");
    expect(getTitleForStars(15)).toBe("master");
  });

  it("never breaks on an impossible number of stars", () => {
    expect(getTitleForStars(-4)).toBe("beginner");
    expect(getTitleForStars(Number.NaN)).toBe("beginner");
  });

  it("has wording for every title in Spanish and English", () => {
    for (const { locale, messages } of [
      { locale: "en", messages: englishMessages },
      { locale: "es", messages: spanishMessages }
    ] as const) {
      const t = createTranslator({ locale, messages, namespace: "rank" });
      for (const key of titleKeys) {
        expect(t(`titles.${key}`), `${locale}.${key}`).toEqual(expect.any(String));
      }
      for (const tier of ["bronze", "silver", "gold"] as const) {
        expect(t(`tiers.${tier}`), `${locale}.${tier}`).toEqual(expect.any(String));
      }
    }
  });
});

describe("the standings of one phone", () => {
  it("puts the player with the most stars first", () => {
    const standings = getLocalStandings([
      { id: "player-1", progress: playerWith(1, 500) },
      { id: "player-2", progress: playerWith(3, 900) }
    ]);

    expect(standings.map((entry) => entry.profileId)).toEqual(["player-2", "player-1"]);
  });

  it("breaks a tie by missions finished, then by who joined first", () => {
    const tied = getLocalStandings([
      { id: "player-2", progress: playerWith(2, 900) },
      { id: "player-1", progress: playerWith(2, 900) }
    ]);

    expect(tied.map((entry) => entry.profileId)).toEqual(["player-1", "player-2"]);
  });

  it("lists a phone with nobody on it as empty rather than failing", () => {
    expect(getLocalStandings([])).toEqual([]);
  });

  it("carries each player's own nickname, and nothing that identifies them further", () => {
    const standings = getLocalStandings([
      { id: "player-1", progress: { ...playerWith(1, 900), localNickname: "Ana" } }
    ]);

    expect(standings[0].nickname).toBe("Ana");
    expect(Object.keys(standings[0])).toEqual(["profileId", "nickname", "rank"]);
  });
});
