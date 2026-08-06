import { describe, expect, it } from "vitest";
import { completeLevel, initialProgressState, type LevelAttempt } from "@/features/progress/progressState";
import {
  createProfileId,
  emptyProfilesDocument,
  getActiveProgress,
  isProfileId,
  parseProfilesDocument,
  updateActiveProgress
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

describe("naming a profile", () => {
  it("counts up and never reuses an id that is taken", () => {
    expect(createProfileId([])).toBe("player-1");
    expect(createProfileId(["player-1"])).toBe("player-2");
    expect(createProfileId(["player-1", "player-3"])).toBe("player-2");
  });

  it("recognises its own ids and nothing else", () => {
    expect(isProfileId("player-1")).toBe(true);
    expect(isProfileId("player-")).toBe(false);
    expect(isProfileId("jugador-1")).toBe(false);
    expect(isProfileId(1)).toBe(false);
  });
});

describe("the player of this device", () => {
  it("starts with nobody at all", () => {
    expect(emptyProfilesDocument.profiles).toEqual([]);
    expect(getActiveProgress(emptyProfilesDocument)).toEqual(initialProgressState);
  });

  it("creates the profile on the first thing worth saving", () => {
    const played = completeLevel(initialProgressState, "basics-1", attempt);
    const document = updateActiveProgress(emptyProfilesDocument, played);

    expect(document.profiles).toHaveLength(1);
    expect(document.activeId).toBe("player-1");
    expect(getActiveProgress(document).completedLevelIds).toEqual(["basics-1"]);
  });

  it("writes later progress into the same profile rather than making another", () => {
    const first = updateActiveProgress(
      emptyProfilesDocument,
      completeLevel(initialProgressState, "basics-1", attempt)
    );
    const second = updateActiveProgress(
      first,
      completeLevel(getActiveProgress(first), "basics-2", {
        ...attempt,
        attemptId: "attempt_223e4567-e89b-12d3-a456-426614174000"
      })
    );

    expect(second.profiles).toHaveLength(1);
    expect(getActiveProgress(second).completedLevelIds).toEqual(["basics-1", "basics-2"]);
  });

  it("does not rewrite anything when the progress is unchanged", () => {
    const document = updateActiveProgress(emptyProfilesDocument, initialProgressState);

    expect(updateActiveProgress(document, getActiveProgress(document))).toBe(document);
  });
});

describe("reading stored profiles", () => {
  it("keeps a valid document", () => {
    const document = updateActiveProgress(
      emptyProfilesDocument,
      completeLevel(initialProgressState, "basics-1", attempt)
    );

    expect(parseProfilesDocument(JSON.parse(JSON.stringify(document)))).toEqual(document);
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

  it("survives corrupt data without losing the readable profile", () => {
    const document = parseProfilesDocument({
      version: 1,
      activeId: "player-9",
      profiles: [{ id: "player-1", progress: { version: 1, completedLevelIds: ["basics-1"] } }, "broken", { id: 42 }]
    });

    expect(document.profiles).toHaveLength(1);
    expect(document.activeId).toBe("player-1");
  });

  it("falls back to an empty device for a document from another version", () => {
    expect(parseProfilesDocument({ version: 99, profiles: [] })).toEqual(emptyProfilesDocument);
    expect(parseProfilesDocument("nonsense")).toEqual(emptyProfilesDocument);
  });

  it("refuses to grow without end, so a corrupt file cannot fill the device", () => {
    const many = Array.from({ length: 200 }, (_, index) => ({
      id: `player-${index + 1}`,
      progress: initialProgressState
    }));

    expect(parseProfilesDocument({ version: 1, activeId: "player-1", profiles: many }).profiles.length).toBeLessThan(
      many.length
    );
  });
});
