/**
 * The mission order. The `state` field is only the state of a player who has not
 * completed anything yet; the live state is always derived from stored progress by
 * `@/features/progress/progressState`, never read from here.
 */
export const missionBlueprint = [
  { key: "training", kind: "training", state: "available", zone: 1 },
  { key: "source", kind: "source", state: "locked", zone: 1 },
  { key: "context", kind: "context", state: "locked", zone: 2 },
  { key: "voices", kind: "voices", state: "locked", zone: 2 },
  { key: "videos", kind: "videos", state: "locked", zone: 2 },
  { key: "share", kind: "share", state: "locked", zone: 3 }
] as const;

export type MissionKey = (typeof missionBlueprint)[number]["key"];
export type MissionKind = (typeof missionBlueprint)[number]["kind"];
export type MissionState = "available" | "locked" | "completed";
export type MissionBlueprint = Omit<(typeof missionBlueprint)[number], "state"> & { state: MissionState };

export type MissionRoute = "/tutorial" | "/case";

/** Where each mission is played. Only the first mission has authored content so far. */
export const missionRoutes: Record<MissionKey, MissionRoute> = {
  training: "/tutorial",
  source: "/case",
  context: "/case",
  voices: "/case",
  videos: "/case",
  share: "/case"
};

export const missionOrder: readonly MissionKey[] = missionBlueprint.map((mission) => mission.key);

export function isMissionKey(value: unknown): value is MissionKey {
  return typeof value === "string" && (missionOrder as readonly string[]).includes(value);
}

export function getMissionRoute(missionId: MissionKey): MissionRoute {
  return missionRoutes[missionId];
}

export function getDefaultMissionKey(missions: readonly MissionBlueprint[] = missionBlueprint): MissionKey {
  return (missions.find((mission) => mission.state === "available") ?? missions[0]).key;
}

export function getMissionByKey(key: MissionKey, missions: readonly MissionBlueprint[] = missionBlueprint): MissionBlueprint {
  return missions.find((mission) => mission.key === key) ?? missions[0];
}

export function getMissionActionHref(mission: MissionBlueprint): "/tutorial" | null {
  return mission.state === "available" ? "/tutorial" : null;
}
