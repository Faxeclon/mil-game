import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import { completeLevel, initialProgressState, type LevelAttempt } from "./progressState";
import {
  getDaysBetween,
  getLocalPlayedOn,
  getStreakToday,
  initialStreak,
  isPlayedOn,
  parseStreak,
  recordPlayedDay,
  type Streak
} from "./streak";

const onDay = (day: string, current: number, best = current): Streak => ({
  currentDays: current,
  bestDays: best,
  lastPlayedOn: day
});

describe("reading a local day", () => {
  it("takes the day the child is living, not the one in UTC", () => {
    // 1 January at 20:00 in Lima is already 2 January in UTC.
    const localNewYearEvening = new Date(2026, 0, 1, 20, 0, 0);

    expect(getLocalPlayedOn(localNewYearEvening)).toBe("2026-01-01");
  });

  it("pads months and days so the format never varies", () => {
    expect(getLocalPlayedOn(new Date(2026, 7, 5, 9, 30))).toBe("2026-08-05");
  });

  it("reports nothing for an invalid date instead of inventing one", () => {
    expect(getLocalPlayedOn(new Date(Number.NaN))).toBeNull();
  });

  it("accepts only real calendar days", () => {
    expect(isPlayedOn("2026-08-05")).toBe(true);
    expect(isPlayedOn("2026-02-31")).toBe(false);
    expect(isPlayedOn("2026-8-5")).toBe(false);
    expect(isPlayedOn("yesterday")).toBe(false);
    expect(isPlayedOn(null)).toBe(false);
  });

  it("counts whole days across a month and a leap year", () => {
    expect(getDaysBetween("2026-08-05", "2026-08-06")).toBe(1);
    expect(getDaysBetween("2026-01-31", "2026-02-01")).toBe(1);
    expect(getDaysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(getDaysBetween("2026-08-06", "2026-08-05")).toBe(-1);
  });
});

describe("building a streak", () => {
  it("starts at one day on the very first mission", () => {
    expect(recordPlayedDay(initialStreak, "2026-08-05")).toEqual(onDay("2026-08-05", 1));
  });

  it("grows by one on each following day", () => {
    let streak = recordPlayedDay(initialStreak, "2026-08-05");
    streak = recordPlayedDay(streak, "2026-08-06");
    streak = recordPlayedDay(streak, "2026-08-07");

    expect(streak).toEqual(onDay("2026-08-07", 3));
  });

  it("does not grow when the player replays the same day", () => {
    const streak = recordPlayedDay(recordPlayedDay(initialStreak, "2026-08-05"), "2026-08-05");

    expect(streak).toEqual(onDay("2026-08-05", 1));
  });

  it("starts over at one after a missed day, because coming back still counts", () => {
    const streak = recordPlayedDay(onDay("2026-08-05", 4), "2026-08-08");

    expect(streak).toEqual(onDay("2026-08-08", 1, 4));
  });

  it("keeps the best streak as a high-water mark", () => {
    const broken = recordPlayedDay(onDay("2026-08-05", 6), "2026-08-09");

    expect(broken.currentDays).toBe(1);
    expect(broken.bestDays).toBe(6);
  });

  it("ignores a day that goes backwards rather than rebuilding from a clock it cannot trust", () => {
    const streak = onDay("2026-08-05", 3);

    expect(recordPlayedDay(streak, "2026-08-01")).toBe(streak);
  });

  it("ignores an unusable day instead of breaking the streak", () => {
    const streak = onDay("2026-08-05", 3);

    expect(recordPlayedDay(streak, "not-a-day")).toBe(streak);
  });
});

describe("the streak as it reads today", () => {
  it("still stands on the same day and on the next one", () => {
    expect(getStreakToday(onDay("2026-08-05", 3), "2026-08-05").currentDays).toBe(3);
    expect(getStreakToday(onDay("2026-08-05", 3), "2026-08-06").currentDays).toBe(3);
  });

  it("reads as broken once a whole day was missed, even before playing again", () => {
    const today = getStreakToday(onDay("2026-08-05", 3), "2026-08-07");

    expect(today.currentDays).toBe(0);
    expect(today.bestDays).toBe(3);
    expect(today.lastPlayedOn).toBe("2026-08-05");
  });

  it("does not change anything for a player who has never finished a mission", () => {
    expect(getStreakToday(initialStreak, "2026-08-05")).toEqual(initialStreak);
  });
});

describe("reading a stored streak", () => {
  it("keeps a valid stored streak", () => {
    expect(parseStreak(onDay("2026-08-05", 2, 9))).toEqual(onDay("2026-08-05", 2, 9));
  });

  it("falls back to no streak for corrupt data", () => {
    expect(parseStreak(undefined)).toEqual(initialStreak);
    expect(parseStreak("broken")).toEqual(initialStreak);
  });

  it("drops a running streak whose day is unusable, but keeps the best already earned", () => {
    // The best streak is a record of something that really happened, so an unreadable
    // last day ends the current run without erasing the achievement behind it.
    expect(parseStreak({ currentDays: 3, bestDays: 3, lastPlayedOn: "2026-02-31" })).toEqual({
      currentDays: 0,
      bestDays: 3,
      lastPlayedOn: null
    });
  });

  it("refuses a count that claims days without a day to stand on", () => {
    expect(parseStreak({ currentDays: 40, bestDays: 40, lastPlayedOn: null }).currentDays).toBe(0);
  });

  it("repairs a best streak lower than the current one", () => {
    expect(parseStreak({ currentDays: 5, bestDays: 2, lastPlayedOn: "2026-08-05" }).bestDays).toBe(5);
  });

  it("drops negative or fractional counts", () => {
    expect(parseStreak({ currentDays: -3, bestDays: 2.7, lastPlayedOn: "2026-08-05" })).toEqual(
      onDay("2026-08-05", 0, 2)
    );
  });
});

describe("the streak alongside the rest of the progress", () => {
  const attempt = (overrides: Partial<LevelAttempt> = {}): LevelAttempt => ({
    attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
    correctRounds: 3,
    totalRounds: 3,
    elapsedMs: 9_000,
    completedAt: "2026-08-05T12:00:00.000Z",
    playedOn: "2026-08-05",
    ...overrides
  });

  it("counts the day when a mission is finished", () => {
    const state = completeLevel(initialProgressState, "basics-1", attempt());

    expect(state.streak).toEqual(onDay("2026-08-05", 1));
  });

  it("does not grow when the player replays on the same day", () => {
    const first = completeLevel(initialProgressState, "basics-1", attempt());
    const replay = completeLevel(first, "basics-1", attempt({ attemptId: "attempt_223e4567-e89b-12d3-a456-426614174000" }));

    expect(replay.streak.currentDays).toBe(1);
  });

  it("grows on the following day", () => {
    const first = completeLevel(initialProgressState, "basics-1", attempt());
    const next = completeLevel(first, "basics-2", attempt({
      attemptId: "attempt_223e4567-e89b-12d3-a456-426614174000",
      playedOn: "2026-08-06"
    }));

    expect(next.streak).toEqual(onDay("2026-08-06", 2));
  });

  it("stands still when the device could not tell which day it was", () => {
    const first = completeLevel(initialProgressState, "basics-1", attempt());
    const undated = completeLevel(first, "basics-2", attempt({
      attemptId: "attempt_223e4567-e89b-12d3-a456-426614174000",
      playedOn: undefined
    }));

    expect(undated.streak).toEqual(first.streak);
    expect(undated.completedLevelIds).toEqual(["basics-1", "basics-2"]);
  });

  it("never unlocks anything on its own", () => {
    const state = { ...initialProgressState, streak: onDay("2026-08-05", 30, 30) };

    expect(state.completedLevelIds).toEqual([]);
  });
});

describe("streak wording in both languages", () => {
  const locales = [
    { locale: "en", messages: englishMessages },
    { locale: "es", messages: spanishMessages }
  ] as const;

  it("writes a day count, a best, and an invitation when there is no streak", () => {
    for (const { locale, messages } of locales) {
      const t = createTranslator({ locale, messages, namespace: "home" });

      expect(t("streakDays", { days: 1 })).not.toBe(t("streakDays", { days: 2 }).replace("2", "1"));
      expect(t("streakDays", { days: 7 })).toContain("7");
      expect(t("streakBest", { days: 9 })).toContain("9");
      expect(t("streakNone").trim().length).toBeGreaterThan(0);
      expect(t("streakNone")).not.toBe(t("hubSoon"));
    }
  });
});
