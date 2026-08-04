import { isLevelId, type LevelId } from "@/features/levels/levelModel";
import { isApprenticeAvatarId, type ApprenticeAvatarId } from "@/features/profile/apprenticeAvatar";
import { normalizeLocalNickname } from "@/features/profile/localNickname";

export const PROGRESS_VERSION = 1;

/**
 * The only completion data persisted is the set of authored levels that were finished.
 * Everything the map needs - what is open and what remains closed - is derived from it.
 */
export type ProgressState = {
  version: typeof PROGRESS_VERSION;
  /** Levels finished, in the order they were finished. */
  completedLevelIds: LevelId[];
  /** True once the player has completed local profile setup and the introduction. */
  onboarded?: boolean;
  /** A private display label stored only on this device. */
  localNickname: string | null;
  /** The selected young apprentice; Roqui remains the game's guide. */
  apprenticeAvatarId: ApprenticeAvatarId | null;
  lastResult?: LevelResult;
};

/** Summary of the attempt a player just finished, used by the results screen. */
export type LevelResult = {
  levelId: LevelId;
  correctRounds: number;
  totalRounds: number;
};

/** Attempt data supplied when a level is completed; the level id comes from the action. */
export type LevelAttempt = Omit<LevelResult, "levelId">;

export const initialProgressState: ProgressState = {
  version: PROGRESS_VERSION,
  completedLevelIds: [],
  localNickname: null,
  apprenticeAvatarId: null
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseResult(value: unknown): LevelResult | undefined {
  if (!isRecord(value)) return undefined;
  const levelId = isLevelId(value.levelId)
    ? value.levelId
    : legacyMissionToLevelId(value.missionId);
  if (!levelId) return undefined;
  const { correctRounds, totalRounds } = value;
  if (typeof correctRounds !== "number" || typeof totalRounds !== "number") return undefined;
  if (!Number.isFinite(correctRounds) || !Number.isFinite(totalRounds) || totalRounds <= 0) return undefined;
  return {
    levelId,
    correctRounds: Math.min(Math.max(Math.trunc(correctRounds), 0), Math.trunc(totalRounds)),
    totalRounds: Math.trunc(totalRounds)
  };
}

/** Only Initial Training had an unambiguous successor in the legacy mission map. */
function legacyMissionToLevelId(value: unknown): LevelId | undefined {
  return value === "training" ? "basics-1" : undefined;
}

function parseCompletedLevelIds(value: unknown): LevelId[] {
  if (!Array.isArray(value)) return [];
  const completed = new Set<LevelId>();
  for (const levelId of value) {
    if (isLevelId(levelId)) completed.add(levelId);
  }
  return [...completed];
}

function migrateLegacyCompletionIds(value: unknown): LevelId[] {
  if (!Array.isArray(value)) return [];
  const completed = new Set<LevelId>();
  for (const missionId of value) {
    const levelId = legacyMissionToLevelId(missionId);
    if (levelId) completed.add(levelId);
  }
  return [...completed];
}

/**
 * Rebuilds a valid state from whatever was stored. Version-one data with the former
 * `completedMissionIds` field migrates only `training` to `basics-1`; every other
 * legacy key has no unambiguous level equivalent and is discarded.
 */
export function parseProgressState(value: unknown): ProgressState {
  if (!isRecord(value) || value.version !== PROGRESS_VERSION) return initialProgressState;

  const completedLevelIds = [
    ...new Set([
      ...parseCompletedLevelIds(value.completedLevelIds),
      ...migrateLegacyCompletionIds(value.completedMissionIds)
    ])
  ];
  const lastResult = parseResult(value.lastResult);
  // `playerName` was the pre-Phase-2B local label. Read it once during parsing so
  // the next state write persists only the canonical `localNickname` field.
  const localNickname = normalizeLocalNickname(value.localNickname) ?? normalizeLocalNickname(value.playerName);
  const apprenticeAvatarId = isApprenticeAvatarId(value.apprenticeAvatarId)
    ? value.apprenticeAvatarId
    : null;

  return {
    version: PROGRESS_VERSION,
    completedLevelIds,
    // Finishing anything proves the player already went through onboarding.
    ...(value.onboarded === true || completedLevelIds.length > 0
      ? { onboarded: true }
      : {}),
    localNickname: localNickname ?? null,
    apprenticeAvatarId,
    ...(lastResult ? { lastResult } : {})
  };
}

/** Records that local profile setup and the introduction are behind the player. */
export function markOnboarded(
  state: ProgressState,
  localNickname?: string,
  apprenticeAvatarId?: ApprenticeAvatarId
): ProgressState {
  const nickname = normalizeLocalNickname(localNickname);
  const avatarId = isApprenticeAvatarId(apprenticeAvatarId)
    ? apprenticeAvatarId
    : state.apprenticeAvatarId;
  if (
    state.onboarded === true &&
    (nickname === undefined || nickname === state.localNickname) &&
    avatarId === state.apprenticeAvatarId
  ) {
    return state;
  }
  return {
    ...state,
    onboarded: true,
    ...(nickname ? { localNickname: nickname } : {}),
    apprenticeAvatarId: avatarId
  };
}

/** Returning players with saved progress need only finish their local profile, not replay Roqui's tutorial. */
export function needsLocalNicknameCompletion(state: ProgressState): boolean {
  return state.onboarded === true && state.localNickname === null;
}

/**
 * Marks a level as finished. Replaying a level already finished changes nothing, so a
 * child can practise as many times as they like without the map moving under them.
 */
export function completeLevel(
  state: ProgressState,
  levelId: LevelId,
  result?: LevelAttempt
): ProgressState {
  // The type prevents invalid calls in app code; this guard protects runtime boundaries.
  if (!isLevelId(levelId)) return state;
  const alreadyCompleted = state.completedLevelIds.includes(levelId);
  if (alreadyCompleted && !result) return state;

  return {
    ...state,
    completedLevelIds: alreadyCompleted ? state.completedLevelIds : [...state.completedLevelIds, levelId],
    onboarded: true,
    ...(result ? { lastResult: { levelId, ...result } } : {})
  };
}

export function isLevelCompleted(state: ProgressState, levelId: string): boolean {
  return isLevelId(levelId) && state.completedLevelIds.includes(levelId);
}

export function resetProgressState(): ProgressState {
  return initialProgressState;
}
