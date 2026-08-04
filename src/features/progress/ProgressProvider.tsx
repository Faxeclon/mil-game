"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { LevelId } from "@/features/levels/levelModel";
import type { ApprenticeAvatarId } from "@/features/profile/apprenticeAvatar";
import {
  type LevelAttempt,
  type LevelResult,
  type ProgressState
} from "./progressState";
import {
  completeLevelInStore,
  getProgressSnapshot,
  markOnboardedInStore,
  getServerProgressSnapshot,
  resetProgressInStore,
  subscribeToProgress
} from "./progressStore";

export type ProgressApi = {
  /** False until the stored progress has been read on the client. */
  hydrated: boolean;
  lastResult?: LevelResult;
  /** Raw state, for the zone and level helpers that derive from it. */
  progressState: ProgressState;
  onboarded: boolean;
  completedLevelIds: LevelId[];
  completeLevel: (levelId: LevelId, result?: LevelAttempt) => void;
  localNickname: string | null;
  apprenticeAvatarId: ApprenticeAvatarId | null;
  markOnboarded: (localNickname?: string, apprenticeAvatarId?: ApprenticeAvatarId) => void;
  resetProgress: () => void;
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
      lastResult: state.lastResult,
      progressState: state,
      onboarded: state.onboarded === true,
      localNickname: state.localNickname,
      apprenticeAvatarId: state.apprenticeAvatarId,
      completedLevelIds: state.completedLevelIds,
      completeLevel: completeLevelInStore,
      markOnboarded: markOnboardedInStore,
      resetProgress: resetProgressInStore
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
