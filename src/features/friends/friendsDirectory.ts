import type { Guardian, Player } from "./friendsModel";

/**
 * The players whose codes this device can resolve.
 *
 * This is a lookup table, not a list to browse. Nothing here reaches a screen until a
 * child types the matching code, so a player exists in the game only for someone who was
 * already given their code. A directory a child could scroll through is exactly what this
 * project promised never to build.
 *
 * Every entry obeys the same rules a real row would: an alias instead of a name, no age,
 * no school, and a grown-up recorded only as a role.
 */
export const seededGuardians: readonly Guardian[] = [
  { id: "g-teacher-1", role: "teacher" },
  { id: "g-parent-1", role: "parent" },
  { id: "g-parent-2", role: "parent" }
];

/**
 * Static aliases for the local demonstration. They are not people or remote accounts.
 */
/*
 * The codes use only the shared alphabet, which has no O/0 and no I/1: these get read out
 * loud and copied by hand, and a code nobody can dictate is a code that does not work.
 */
export const seededPlayers: readonly Player[] = [
  { id: "p-roqui-47", alias: "Roqui 47", code: "RQ47KM", guardianId: "g-parent-1" },
  { id: "p-tunki-12", alias: "Tunki 12", code: "TK92PB", guardianId: "g-parent-1" },
  { id: "p-quri-08", alias: "Quri 08", code: "QR58HD", guardianId: "g-parent-2" },
  { id: "p-wayra-23", alias: "Wayra 23", code: "WY23FN", guardianId: "g-teacher-1" },
  { id: "p-illa-05", alias: "Illa 05", code: "JL45CT", guardianId: "g-teacher-1" }
];

/**
 * Who already used this child's code and is waiting for an answer.
 *
 * These are sample inbox rows. With no server nobody can knock in real time.
 */
export const seededIncoming: readonly string[] = ["p-quri-08", "p-wayra-23"];

export function getGuardian(guardianId: string): Guardian | undefined {
  return seededGuardians.find((guardian) => guardian.id === guardianId);
}

export function getPlayer(playerId: string): Player | undefined {
  return seededPlayers.find((player) => player.id === playerId);
}
