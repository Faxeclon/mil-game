"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { MissionKey, MissionRoute, MissionState } from "@/features/missions/missionMap";
import {
  getAvailableMissionId,
  getMissionForRoute,
  getMissionState,
  isMissionUnlocked,
  isRouteUnlocked,
  type MissionResult,
  type ProgressState
} from "./progressState";
import {
  completeLevelInStore,
  completeMissionInStore,
  getProgressSnapshot,
  markOnboardedInStore,
  getServerProgressSnapshot,
  resetProgressInStore,
  subscribeToProgress
} from "./progressStore";

export type ProgressApi = {
  /** False until the stored progress has been read on the client. */
  hydrated: boolean;
  completedMissionIds: MissionKey[];
  availableMissionId: MissionKey | null;
  lastPlayedMissionId?: MissionKey;
  lastResult?: MissionResult;
  /** Raw state, for the zone and level helpers that derive from it. */
  progressState: ProgressState;
  onboarded: boolean;
  completedLevelIds: string[];
  completeMission: (missionId: MissionKey, result?: MissionResult) => void;
  completeLevel: (levelId: string, result?: MissionResult) => void;
  playerName?: string;
  markOnboarded: (playerName?: string) => void;
  resetProgress: () => void;
  isMissionUnlocked: (missionId: MissionKey) => boolean;
  getMissionState: (missionId: MissionKey) => MissionState;
  isRouteUnlocked: (route: MissionRoute) => boolean;
  getMissionForRoute: (route: MissionRoute) => MissionKey | null;
};

const ProgressContext = createContext<ProgressApi | null>(null);

/** Single owner of the stored progress for the whole app. */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const { hydrated, state } = useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    getServerProgressSnapshot
  );

  const value = useMemo<ProgressApi>(
    () => ({
      hydrated,
      completedMissionIds: state.completedMissionIds,
      availableMissionId: getAvailableMissionId(state),
      lastPlayedMissionId: state.lastPlayedMissionId,
      lastResult: state.lastResult,
      progressState: state,
      onboarded: state.onboarded === true,
      playerName: state.playerName,
      completedLevelIds: state.completedLevelIds,
      completeMission: completeMissionInStore,
      completeLevel: completeLevelInStore,
      markOnboarded: markOnboardedInStore,
      resetProgress: resetProgressInStore,
      isMissionUnlocked: (missionId) => isMissionUnlocked(state, missionId),
      getMissionState: (missionId) => getMissionState(state, missionId),
      isRouteUnlocked: (route) => isRouteUnlocked(state, route),
      getMissionForRoute: (route) => getMissionForRoute(state, route)
    }),
    [hydrated, state]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

/** Reads the shared progress. Settings and any other screen should use this, not localStorage. */
export function useProgress(): ProgressApi {
  const context = useContext(ProgressContext);
  if (!context) throw new Error("useProgress must be used inside a ProgressProvider.");
  return context;
}
