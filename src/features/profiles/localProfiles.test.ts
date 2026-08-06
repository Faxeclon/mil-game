import { describe, expect, it } from "vitest";
import { completeLevel, initialProgressState, type LevelAttempt } from "@/features/progress/progressState";
import {
  addProfile,
  canAddProfile,
  createProfileId,
  emptyProfilesDocument,
  getActiveProgress,
  MAX_LOCAL_PROFILES,
  parseProfilesDocument,
  removeProfile,
  selectProfile,
  updateActiveProgress,
  type ProfilesDocument
} from "./localProfiles";

const attempt: LevelAttempt = {
  attemptId: "attempt_123e4567-e89b-12d3-a456-426614174000",
  correctRounds: 3,
  totalRounds: 3,
  elapsedMs: 9_000,
  completedAt: "2026-08-05T12:00:00.000Z",
  score: 900,
  playedOn: "2026-08-05"
};

function withTwoPlayers(): ProfilesDocument {
  return addProfile(addProfile(emptyProfilesDocument));
}

describe("naming a profile", () => {
  it("counts up and never reuses an id that is taken", () => {
    expect(createProfileId([])).toBe("player-1");
    expect(createProfileId(["player-1"])).toBe("player-2");
    expect(createProfileId(["player-1", "player-3"])).toBe("player-2");
  });
});

describe("sharing the phone", () => {
  it("starts with nobody, then hands the phone to the first player added", () => {
    expect(emptyProfilesDocument.profiles).toEqual([]);

    const first = addProfile(emptyProfilesDocument);
    expect(first.profiles).toHaveLength(1);
    expect(first.activeId).toBe("player-1");
  });

  it("hands the phone to a newly added player straight away", () => {
    expect(withTwoPlayers().activeId).toBe("player-2");
  });

  it("keeps adding players without a rule about how many a family has", () => {
    let document = emptyProfilesDocument;
    for (let index = 0; index < 10; index += 1) document = addProfile(document);

    expect(document.profiles).toHaveLength(10);
    expect(canAddProfile(document)).toBe(true);
  });

  it("still refuses to grow without end, so a loop cannot fill the device", () => {
    let document = emptyProfilesDocument;
    for (let index = 0; index < MAX_LOCAL_PROFILES + 5; index += 1) document = addProfile(document);

    expect(document.profiles).toHaveLength(MAX_LOCAL_PROFILES);
    expect(canAddProfile(document)).toBe(false);
  });

  it("switches between players and ignores an unknown one", () => {
    const document = withTwoPlayers();

    expect(selectProfile(document, "player-1").activeId).toBe("player-1");
    expect(selectProfile(document, "player-9")).toBe(document);
  });
});

describe("keeping the players apart", () => {
  it("writes progress only into the player who is holding the phone", () => {
    let document = withTwoPlayers();
    document = updateActiveProgress(document, completeLevel(initialProgressState, "basics-1", attempt));

    expect(getActiveProgress(document).completedLevelIds).toEqual(["basics-1"]);
    expect(document.profiles[0].progress.completedLevelIds).toEqual([]);
  });

  it("gives each sibling their own medals and streak", () => {
    let document = withTwoPlayers();
    document = updateActiveProgress(document, completeLevel(initialProgressState, "basics-1", attempt));
    document = selectProfile(document, "player-1");
    document = updateActiveProgress(
      document,
      completeLevel(initialProgressState, "basics-1", { ...attempt, score: 400 })
    );

    expect(document.profiles[0].progress.bestResultsByLevelId["basics-1"]?.score).toBe(400);
    expect(document.profiles[1].progress.bestResultsByLevelId["basics-1"]?.score).toBe(900);
    expect(document.profiles[0].progress.streak.currentDays).toBe(1);
  });

  it("does not rewrite anything when the active progress is unchanged", () => {
    const document = withTwoPlayers();

    expect(updateActiveProgress(document, getActiveProgress(document))).toBe(document);
  });
});

describe("removing a player", () => {
  it("takes the profile away and passes the phone to whoever is left", () => {
    const document = removeProfile(withTwoPlayers(), "player-2");

    expect(document.profiles.map((profile) => profile.id)).toEqual(["player-1"]);
    expect(document.activeId).toBe("player-1");
  });

  it("refuses to empty the phone, which is what the reset action is for", () => {
    const single = addProfile(emptyProfilesDocument);

    expect(removeProfile(single, "player-1")).toBe(single);
  });
});

describe("reading stored profiles", () => {
  it("keeps a valid document", () => {
    const document = withTwoPlayers();

    expect(parseProfilesDocument(document).profiles).toHaveLength(2);
  });

  it("turns a device that already played into that child's profile", () => {
    const played = completeLevel(initialProgressState, "basics-1", attempt);
    const document = parseProfilesDocument(undefined, played);

    expect(document.profiles).toHaveLength(1);
    expect(document.activeId).toBe("player-1");
    expect(getActiveProgress(document).completedLevelIds).toEqual(["basics-1"]);
  });

  it("does not invent a profile for a device that never played", () => {
    expect(parseProfilesDocument(undefined, initialProgressState)).toEqual(emptyProfilesDocument);
    expect(parseProfilesDocument(undefined)).toEqual(emptyProfilesDocument);
  });

  it("survives corrupt data without losing the readable profiles", () => {
    const document = parseProfilesDocument({
      version: 1,
      activeId: "player-9",
      profiles: [{ id: "player-1", progress: { version: 1, completedLevelIds: ["basics-1"] } }, "broken", { id: 42 }]
    });

    expect(document.profiles).toHaveLength(1);
    expect(document.activeId).toBe("player-1");
  });

  it("falls back to an empty phone for a document from another version", () => {
    expect(parseProfilesDocument({ version: 99, profiles: [] })).toEqual(emptyProfilesDocument);
    expect(parseProfilesDocument("nonsense")).toEqual(emptyProfilesDocument);
  });
});
