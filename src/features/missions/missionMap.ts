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

export function getDefaultMissionKey(missions: readonly MissionBlueprint[] = missionBlueprint): MissionKey {
  return (missions.find((mission) => mission.state === "available") ?? missions[0]).key;
}

export function getMissionByKey(key: MissionKey, missions: readonly MissionBlueprint[] = missionBlueprint): MissionBlueprint {
  return missions.find((mission) => mission.key === key) ?? missions[0];
}

export function getMissionActionHref(mission: MissionBlueprint): "/tutorial" | null {
  return mission.state === "available" ? "/tutorial" : null;
}
