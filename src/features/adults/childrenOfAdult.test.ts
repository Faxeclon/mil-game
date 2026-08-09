import { describe, expect, it } from "vitest";
import { createAdultAccount, type AdultAccount } from "./adultAccount";
import { daysBetween, getChildrenOf, getOwnGameOf, getUnlinkedChildren, summariseChild } from "./childrenOfAdult";
import type { LocalProfile } from "@/features/profiles/localProfiles";
import { initialProgressState } from "@/features/progress/progressState";

const marta = createAdultAccount("marta@example.com", "family", "2026-08-01") as AdultAccount;
const rosa = createAdultAccount("rosa@example.com", "teacher", "2026-08-01") as AdultAccount;

/** A child on this phone, optionally authorised by one grown-up. */
function child(id: string, nickname: string, guardianEmail?: string): LocalProfile {
  return {
    id,
    progress: {
      ...initialProgressState,
      onboarded: true,
      localNickname: nickname,
      guardian: guardianEmail
        ? { email: guardianEmail, authorizedOn: "2026-08-01", syncPending: true }
        : null
    }
  };
}

/** A grown-up's own game, which is a profile like any other but nobody's child. */
function ownGame(id: string, email: string): LocalProfile {
  return {
    id,
    progress: {
      ...initialProgressState,
      onboarded: true,
      localNickname: email.split("@")[0],
      adultEmail: email
    }
  };
}

describe("the children a grown-up looks after", () => {
  it("shows only the ones who named them, never somebody else's", () => {
    const profiles = [
      child("player-1", "Lu", "marta@example.com"),
      child("player-2", "Ana", "rosa@example.com"),
      child("player-3", "Beto")
    ];

    expect(getChildrenOf(marta, profiles).map((profile) => profile.id)).toEqual(["player-1"]);
    expect(getChildrenOf(rosa, profiles).map((profile) => profile.id)).toEqual(["player-2"]);
    expect(getChildrenOf(null, profiles)).toEqual([]);
  });

  /*
   * A grown-up who plays a round to see what their child is doing is not thereby a child.
   * Their game carries their address, and that is what keeps it out of their own list.
   */
  it("never counts the grown-up's own game as one of them", () => {
    const profiles = [child("player-1", "Lu", "marta@example.com"), ownGame("player-2", "marta@example.com")];

    expect(getChildrenOf(marta, profiles).map((profile) => profile.id)).toEqual(["player-1"]);
    expect(getUnlinkedChildren(profiles)).toEqual([]);
    expect(getOwnGameOf(marta, profiles)?.id).toBe("player-2");
  });

  it("finds no game of their own before they have played one", () => {
    expect(getOwnGameOf(marta, [child("player-1", "Lu", "marta@example.com")])).toBeNull();
    expect(getOwnGameOf(null, [ownGame("player-1", "marta@example.com")])).toBeNull();
  });

  it("counts a child nobody has claimed, so the phone can say so", () => {
    const profiles = [child("player-1", "Lu", "marta@example.com"), child("player-2", "Beto")];

    expect(getUnlinkedChildren(profiles).map((profile) => profile.id)).toEqual(["player-2"]);
  });
});

describe("what a grown-up reads about one child", () => {
  it("is a nickname and progress, never a real name", () => {
    const summary = summariseChild(child("player-1", "Lu", "marta@example.com"), "2026-08-08");

    expect(summary).toMatchObject({ id: "player-1", nickname: "Lu", done: 0, percent: 0, streakDays: 0 });
    expect(Object.keys(summary)).not.toContain("email");
  });

  it("survives a device that cannot read its own calendar", () => {
    const summary = summariseChild(child("player-1", "Lu"), null);

    expect(summary.streakDays).toBe(0);
    // Without a today there is nothing to count back from, so it says so rather than guessing.
    expect(summary.daysSincePlayed).toBeNull();
  });

  it("reports only recorded time in completed missions, rounded so that any time shows", () => {
    const playing = child("player-1", "Lu", "marta@example.com");
    playing.progress = { ...playing.progress, playedMs: 90_000 };

    expect(summariseChild(playing, "2026-08-08").playedMinutes).toBe(2);
  });

  it("says how many days ago, not the date, because that is the question", () => {
    const playing = child("player-1", "Lu", "marta@example.com");
    playing.progress = {
      ...playing.progress,
      streak: { currentDays: 0, bestDays: 3, lastPlayedOn: "2026-08-04" }
    };

    expect(summariseChild(playing, "2026-08-08").daysSincePlayed).toBe(4);
  });

  it("counts nothing for a child who has never finished a mission", () => {
    const summary = summariseChild(child("player-1", "Lu"), "2026-08-08");

    expect(summary.playedMinutes).toBe(0);
    expect(summary.daysSincePlayed).toBeNull();
  });

  it("does not invent mission time or a completion date for profile and map actions", () => {
    const untouched = child("player-1", "Lu", "marta@example.com");

    expect(summariseChild(untouched, "2026-08-08")).toMatchObject({
      playedMinutes: 0,
      daysSincePlayed: null
    });
  });
});

describe("counting days between two calendar days", () => {
  it("reads a plain gap", () => {
    expect(daysBetween("2026-08-01", "2026-08-08")).toBe(7);
    expect(daysBetween("2026-08-08", "2026-08-08")).toBe(0);
  });

  /* A clock set back is not evidence a child played in the future. */
  it("never counts backwards", () => {
    expect(daysBetween("2026-08-10", "2026-08-08")).toBe(0);
  });

  it("gives back nothing rather than a number it cannot stand behind", () => {
    expect(daysBetween(null, "2026-08-08")).toBeNull();
    expect(daysBetween("2026-08-01", null)).toBeNull();
    expect(daysBetween("ayer", "2026-08-08")).toBeNull();
  });
});
