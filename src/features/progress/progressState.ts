import {
  isMissionKey,
  missionOrder,
  type MissionKey,
  type MissionRoute,
  type MissionState,
  missionRoutes
} from "@/features/missions/missionMap";

export const PROGRESS_VERSION = 1;

/**
 * The only thing worth persisting is which missions were finished. Everything else the
 * map needs - which mission is open, which are still closed, which route segment is
 * lit - is derived from that list, so the stored data can never contradict itself.
 */
export type ProgressState = {
  version: typeof PROGRESS_VERSION;
  completedMissionIds: MissionKey[];
  /** Levels finished, in the order they were finished. The unit the map now plays. */
  completedLevelIds: string[];
  /** True once the player has been through sign-up and the introduction. */
  onboarded?: boolean;
  /** The detective name the player chose for themselves at sign-up. */
  playerName?: string;
  lastPlayedMissionId?: MissionKey;
  lastResult?: MissionResult;
};

/** Summary of the attempt a player just finished, used by the results screen. */
export type MissionResult = {
  missionId: MissionKey;
  correctRounds: number;
  totalRounds: number;
};

export const initialProgressState: ProgressState = {
  version: PROGRESS_VERSION,
  completedMissionIds: [],
  completedLevelIds: []
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseResult(value: unknown): MissionResult | undefined {
  if (!isRecord(value) || !isMissionKey(value.missionId)) return undefined;
  const { correctRounds, totalRounds } = value;
  if (typeof correctRounds !== "number" || typeof totalRounds !== "number") return undefined;
  if (!Number.isFinite(correctRounds) || !Number.isFinite(totalRounds) || totalRounds <= 0) return undefined;
  return {
    missionId: value.missionId,
    correctRounds: Math.min(Math.max(Math.trunc(correctRounds), 0), Math.trunc(totalRounds)),
    totalRounds: Math.trunc(totalRounds)
  };
}

/**
 * Rebuilds a valid state from whatever was stored. Never throws: corrupt, outdated or
 * hand-edited data falls back to a fresh start, and unknown mission ids are dropped.
 */
export function parseProgressState(value: unknown): ProgressState {
  if (!isRecord(value) || value.version !== PROGRESS_VERSION) return initialProgressState;

  const stored = Array.isArray(value.completedMissionIds) ? value.completedMissionIds : [];
  // Filtering the canonical order deduplicates, drops unknown ids and fixes ordering.
  const completedMissionIds = missionOrder.filter((missionId) => stored.includes(missionId));

  const storedLevels = Array.isArray(value.completedLevelIds) ? value.completedLevelIds : [];
  const completedLevelIds = [
    ...new Set(storedLevels.filter((levelId): levelId is string => typeof levelId === "string"))
  ];
  const lastPlayedMissionId = isMissionKey(value.lastPlayedMissionId) ? value.lastPlayedMissionId : undefined;
  const lastResult = parseResult(value.lastResult);

  return {
    version: PROGRESS_VERSION,
    completedMissionIds,
    completedLevelIds,
    // Finishing anything proves the player already went through onboarding.
    ...(value.onboarded === true || completedMissionIds.length > 0 || completedLevelIds.length > 0
      ? { onboarded: true }
      : {}),
    ...(normalizePlayerName(value.playerName) ? { playerName: normalizePlayerName(value.playerName) } : {}),
    ...(lastPlayedMissionId ? { lastPlayedMissionId } : {}),
    ...(lastResult ? { lastResult } : {})
  };
}

/** Longest name the interface can show without wrapping awkwardly. */
const MAX_PLAYER_NAME_LENGTH = 24;

export function normalizePlayerName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Records that sign-up and the introduction are behind us, with the chosen name. */
export function markOnboarded(state: ProgressState, playerName?: string): ProgressState {
  const name = normalizePlayerName(playerName) ?? state.playerName;
  if (state.onboarded === true && name === state.playerName) return state;
  return { ...state, onboarded: true, ...(name ? { playerName: name } : {}) };
}

/**
 * Marks a mission as finished. Completing the same mission again changes nothing and
 * returns the very same state, so subscribers are not woken up for a no-op.
 */
export function completeMission(
  state: ProgressState,
  missionId: MissionKey,
  result?: MissionResult
): ProgressState {
  if (!isMissionKey(missionId)) return state;

  const alreadyCompleted = state.completedMissionIds.includes(missionId);
  if (alreadyCompleted && state.lastPlayedMissionId === missionId && !result) return state;

  const completedMissionIds = alreadyCompleted
    ? state.completedMissionIds
    : missionOrder.filter((key) => key === missionId || state.completedMissionIds.includes(key));

  return {
    ...state,
    completedMissionIds,
    onboarded: true,
    lastPlayedMissionId: missionId,
    ...(result ? { lastResult: result } : {})
  };
}

/**
 * Marks a level as finished. Replaying a level already finished changes nothing, so a
 * child can practise as many times as they like without the map moving under them.
 */
export function completeLevel(
  state: ProgressState,
  levelId: string,
  result?: MissionResult
): ProgressState {
  const alreadyCompleted = state.completedLevelIds.includes(levelId);
  if (alreadyCompleted && !result) return state;

  return {
    ...state,
    completedLevelIds: alreadyCompleted ? state.completedLevelIds : [...state.completedLevelIds, levelId],
    onboarded: true,
    ...(result ? { lastResult: result } : {})
  };
}

export function isLevelCompleted(state: ProgressState, levelId: string): boolean {
  return state.completedLevelIds.includes(levelId);
}

/** The first unfinished mission, or null once every mission is completed. */
export function getAvailableMissionId(state: ProgressState): MissionKey | null {
  return missionOrder.find((missionId) => !state.completedMissionIds.includes(missionId)) ?? null;
}

export function getMissionState(state: ProgressState, missionId: MissionKey): MissionState {
  if (state.completedMissionIds.includes(missionId)) return "completed";
  return getAvailableMissionId(state) === missionId ? "available" : "locked";
}

export function isMissionUnlocked(state: ProgressState, missionId: MissionKey): boolean {
  return getMissionState(state, missionId) !== "locked";
}

/** True when at least one unlocked mission is played on the given route. */
export function isRouteUnlocked(state: ProgressState, route: MissionRoute): boolean {
  return missionOrder.some(
    (missionId) => missionRoutes[missionId] === route && isMissionUnlocked(state, missionId)
  );
}

/** The unlocked mission a route should serve, preferring the one still to be played. */
export function getMissionForRoute(state: ProgressState, route: MissionRoute): MissionKey | null {
  const available = getAvailableMissionId(state);
  if (available && missionRoutes[available] === route) return available;
  const unlocked = missionOrder.filter(
    (missionId) => missionRoutes[missionId] === route && isMissionUnlocked(state, missionId)
  );
  return unlocked.at(-1) ?? null;
}

export function resetProgressState(): ProgressState {
  return initialProgressState;
}
