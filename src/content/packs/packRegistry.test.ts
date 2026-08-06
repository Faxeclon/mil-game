import { describe, expect, it } from "vitest";
import { missionBlueprint } from "@/features/levels/levelModel";
import { contentPacks, getContentPack, getSinglePack, hasContentPack, singlePacks } from "./packRegistry";

const playableMissions = missionBlueprint.filter((mission) => Boolean(mission.packId));

describe("the content registry", () => {
  it("hands every declared pack over already validated", () => {
    for (const [packId, pack] of Object.entries(contentPacks)) {
      expect(pack.id, packId).toBe(packId);
      expect(pack.rounds).toHaveLength(3);
    }
  });

  it("hands every single-image pack over already validated", () => {
    for (const [packId, pack] of Object.entries(singlePacks)) {
      expect(pack.id, packId).toBe(packId);
      expect(pack.rounds).toHaveLength(3);
    }
  });

  it("resolves the pack of every mission that claims to have one", () => {
    for (const mission of playableMissions) {
      expect(hasContentPack(mission.packId), mission.id).toBe(true);
    }
  });

  it("returns nothing for a mission with no pack, so it stays coming soon", () => {
    expect(getContentPack(undefined)).toBeUndefined();
    expect(getContentPack("no-such-pack-v1")).toBeUndefined();
    expect(getSinglePack("no-such-pack-v1")).toBeUndefined();
    expect(hasContentPack(undefined)).toBe(false);
  });

  it("keeps the two pack shapes apart, so a mission cannot be handed the wrong one", () => {
    expect(getContentPack("animals-single-v1")).toBeUndefined();
    expect(getSinglePack("animals-compare-v1")).toBeUndefined();
  });
});

describe("every mission plays its own rounds", () => {
  it("gives each playable mission a pack of its own", () => {
    const packIds = playableMissions.map((mission) => mission.packId);

    expect(new Set(packIds).size, `shared packs: ${packIds.join(", ")}`).toBe(packIds.length);
  });

  it("never shows the same image in two different missions", () => {
    const seen = new Map<string, string>();
    const claim = (src: string, missionId: string) => {
      const owner = seen.get(src);
      expect(owner, `${src} is reused by ${missionId} and ${owner}`).toBeUndefined();
      seen.set(src, missionId);
    };

    for (const mission of playableMissions) {
      for (const round of getContentPack(mission.packId)?.rounds ?? []) {
        for (const choice of round.choices) claim(choice.media.src, mission.id);
      }
      for (const round of getSinglePack(mission.packId)?.rounds ?? []) {
        claim(round.media.src, mission.id);
      }
    }
  });

  it("puts the answer on both sides across a pack, so position is not the clue", () => {
    for (const [packId, pack] of Object.entries(contentPacks)) {
      const answerSides = pack.rounds.map(
        (round) => round.choices.find((choice) => choice.id === round.correctChoiceId)?.position
      );

      expect(new Set(answerSides).size, `${packId} always answers on the same side`).toBeGreaterThan(1);
    }
  });

  it("keeps every image a marked placeholder until reviewed media replaces it", () => {
    for (const pack of Object.values(contentPacks)) {
      for (const round of pack.rounds) {
        for (const choice of round.choices) {
          expect(choice.media.provenance.temporary, choice.media.src).toBe(true);
        }
      }
    }
    for (const pack of Object.values(singlePacks)) {
      for (const round of pack.rounds) {
        expect(round.media.provenance.temporary, round.media.src).toBe(true);
      }
    }
  });

  it("never lets a single-image mission be won by always tapping the same answer", () => {
    for (const [packId, pack] of Object.entries(singlePacks)) {
      const answers = new Set(pack.rounds.map((round) => round.answer));

      expect(answers.size, `${packId} always has the same answer`).toBeGreaterThan(1);
    }
  });

  it("offers the uncertain answer only where a round actually needs it", () => {
    for (const [packId, pack] of Object.entries(singlePacks)) {
      const usesUnknown = pack.rounds.some((round) => round.answer === "unknown");

      // A third button that can never be right would teach that doubting is a mistake.
      expect(usesUnknown, `${packId}`).toBe(pack.allowsUncertain);
    }
  });

  it("has at least one mission where looking is not enough to know", () => {
    const uncertain = Object.values(singlePacks).filter((pack) => pack.allowsUncertain);

    expect(uncertain.length).toBeGreaterThan(0);
  });

  it("keeps a single-image answer equal to the image's own origin", () => {
    for (const pack of Object.values(singlePacks)) {
      for (const round of pack.rounds) {
        expect(round.answer, round.media.src).toBe(round.media.origin);
      }
    }
  });
});
