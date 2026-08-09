import { getGlobalProgress } from "@/features/levels/progressSummary";
import type { LocalProfile } from "@/features/profiles/localProfiles";
import { getStreakToday } from "@/features/progress/streak";
import { getPlayerRank } from "@/features/ranks/playerRank";
import type { AdultAccount } from "./adultAccount";

/**
 * The children a grown-up looks after, on this device.
 *
 * The link is stored the way it is given: a child's profile records the adult who
 * authorised them. So the list is derived by asking each profile whose consent it holds,
 * rather than kept as a second copy on the adult that could drift from the first.
 *
 * Nothing here is a real name. A child is their nickname and their medals, which is all
 * this game ever knows about them.
 */
export type ChildSummary = {
  id: string;
  nickname: string;
  done: number;
  total: number;
  percent: number;
  streakDays: number;
  rankTitleKey: string;
  stars: number;
  /** Whole minutes from completed mission attempts. Rounded up, so any recorded time reads as some. */
  playedMinutes: number;
  /**
   * Days since they last completed a mission, or null if they never have.
   *
   * Days rather than a date, because this is a completed-mission record rather than a
   * measure of the child's general app activity.
   */
  daysSincePlayed: number | null;
};

/** Whole days between two local calendar days, or null if either is missing or unreadable. */
export function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

/**
 * Every profile authorised by this adult; nobody else's children are ever shown.
 *
 * A grown-up's own game carries their address and is left out, or a parent who played a
 * round to see what their child was doing would appear in their own list as a child.
 */
export function getChildrenOf(account: AdultAccount | null, profiles: readonly LocalProfile[]): LocalProfile[] {
  if (!account) return [];
  return profiles.filter(
    (profile) => profile.progress.adultEmail === null && profile.progress.guardian?.email === account.email
  );
}

/** Profiles on this device that no adult has claimed yet. */
export function getUnlinkedChildren(profiles: readonly LocalProfile[]): LocalProfile[] {
  return profiles.filter((profile) => profile.progress.adultEmail === null && !profile.progress.guardian);
}

/** The grown-up's own game on this device, if they have started one. */
export function getOwnGameOf(
  account: AdultAccount | null,
  profiles: readonly LocalProfile[]
): LocalProfile | null {
  if (!account) return null;
  return profiles.find((profile) => profile.progress.adultEmail === account.email) ?? null;
}

/**
 * What the grown-up reads about one child.
 *
 * `today` is passed in rather than read here, so the same profile summarised twice in one
 * render cannot disagree about what day it is.
 */
export function summariseChild(profile: LocalProfile, today: string | null): ChildSummary {
  const overall = getGlobalProgress(profile.progress);
  const streak = today ? getStreakToday(profile.progress.streak, today) : profile.progress.streak;
  const rank = getPlayerRank(profile.progress);

  return {
    id: profile.id,
    nickname: profile.progress.localNickname ?? "",
    done: overall.done,
    total: overall.total,
    percent: overall.percent,
    streakDays: streak.currentDays,
    rankTitleKey: rank.titleKey,
    stars: rank.stars,
    playedMinutes: Math.ceil(profile.progress.playedMs / 60_000),
    daysSincePlayed: daysBetween(profile.progress.streak.lastPlayedOn, today)
  };
}

export function summariseChildren(profiles: readonly LocalProfile[], today: string | null): ChildSummary[] {
  return profiles.map((profile) => summariseChild(profile, today));
}
