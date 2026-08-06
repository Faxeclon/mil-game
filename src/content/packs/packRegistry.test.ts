import { describe, expect, it } from "vitest";
import { missionBlueprint } from "@/features/levels/levelModel";
import { contentPacks, getContentPack } from "./packRegistry";

const playableMissions = missionBlueprint.filter((mission) => Boolean(mission.packId));

describe("the content registry", () => {
  it("hands every declared pack over already validated", () => {
    for (const [packId, pack] of Object.entries(contentPacks)) {
      expect(pack.id, packId).toBe(packId);
      expect(pack.rounds).toHaveLength(3);
    }
  });

  it("resolves the pack of every mission that claims to have one", () => {
    for (const mission of playableMissions) {
      expect(getContentPack(mission.packId), mission.id).toBeDefined();
    }
  });

  it("returns nothing for a mission with no pack, so it stays coming soon", () => {
    expect(getContentPack(undefined)).toBeUndefined();
    expect(getContentPack("no-such-pack-v1")).toBeUndefined();
  });
});

describe("every mission plays its own rounds", () => {
  it("gives each playable mission a pack of its own", () => {
    const packIds = playableMissions.map((mission) => mission.packId);

    expect(new Set(packIds).size, `shared packs: ${packIds.join(", ")}`).toBe(packIds.length);
  });

  it("never shows the same image in two different missions", () => {
    const seen = new Map<string, string>();

    for (const mission of playableMissions) {
      const pack = getContentPack(mission.packId);
      for (const round of pack?.rounds ?? []) {
        for (const choice of round.choices) {
          const owner = seen.get(choice.media.src);
          expect(owner, `${choice.media.src} is reused by ${mission.id} and ${owner}`).toBeUndefined();
          seen.set(choice.media.src, mission.id);
        }
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
  });
});
