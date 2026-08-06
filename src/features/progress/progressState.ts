import { isLevelId, type LevelId } from "@/features/levels/levelModel";
import { isApprenticeAvatarId, type ApprenticeAvatarId } from "@/features/profile/apprenticeAvatar";
import { normalizeLocalNickname } from "@/features/profile/localNickname";
import { isAttemptId, parseCompletedAt, parseElapsedMs } from "./attemptMetadata";
import { parseBestResults, updateBestResults, type BestResultsByLevelId } from "./bestResults";
import { parseLevelScore } from "@/features/scoring/levelScore";

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
  /**
   * The best local run per level. A keepsake only: unlocking still comes solely from
   * `completedLevelIds`, so a record can never open a mission on its own.
   */
  bestResultsByLevelId: BestResultsByLevelId;
};

/** Summary of the attempt a player just finished, used by the results screen. */
export type LevelResult = {
  levelId: LevelId;
  attemptId: string | null;
  correctRounds: number;
  totalRounds: number;
  elapsedMs: number | null;
  completedAt: string | null;
  /** Null for results stored before scoring existed; shown honestly, never invented. */
  score: number | null;
};

/** Attempt data supplied when a level is completed; the level id comes from the action. */
export type LevelAttempt = {
  attemptId: string;
  correctRounds: number;
  totalRounds: number;
  elapsedMs: number;
  completedAt: string;
  /** Optional so attempts recorded before scoring existed still validate. */
  score?: number;
};

export const initialProgressState: ProgressState = {
  version: PROGRESS_VERSION,
  completedLevelIds: [],
  localNickname: null,
  apprenticeAvatarId: null,
  bestResultsByLevelId: {}
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
    attemptId: isAttemptId(value.attemptId) ? value.attemptId : null,
    correctRounds: Math.min(Math.max(Math.trunc(correctRounds), 0), Math.trunc(totalRounds)),
    totalRounds: Math.trunc(totalRounds),
    elapsedMs: parseElapsedMs(value.elapsedMs),
    completedAt: parseCompletedAt(value.completedAt),
    score: parseLevelScore(value.score)
  };
}

function normalizeLevelAttempt(value: unknown): LevelAttempt | undefined {
  if (!isRecord(value)) return undefined;
  const { correctRounds, totalRounds } = value;
  if (typeof correctRounds !== "number" || typeof totalRounds !== "number") return undefined;
  if (!Number.isFinite(correctRounds) || !Number.isFinite(totalRounds) || totalRounds <= 0) return undefined;
  const attemptId = isAttemptId(value.attemptId) ? value.attemptId : undefined;
  const elapsedMs = parseElapsedMs(value.elapsedMs);
  const completedAt = parseCompletedAt(value.completedAt);
  if (!attemptId || elapsedMs === null || !completedAt) return undefined;
  return {
    attemptId,
    correctRounds: Math.min(Math.max(Math.trunc(correctRounds), 0), Math.trunc(totalRounds)),
    totalRounds: Math.trunc(totalRounds),
    elapsedMs,
    completedAt,
    // Absent for attempts recorded before scoring existed; never invented here.
    ...(parseLevelScore(value.score) === null ? {} : { score: parseLevelScore(value.score) as number })
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
    bestResultsByLevelId: parseBestResults(value.bestResultsByLevelId),
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
 * Marks a level as finished. Replays keep the map position stable while replacing the
 * latest result with the newly completed attempt.
 */
export function completeLevel(
  state: ProgressState,
  levelId: LevelId,
  result: LevelAttempt
): ProgressState {
  // The type prevents invalid calls in app code; this guard protects runtime boundaries.
  const attempt = normalizeLevelAttempt(result);
  if (!isLevelId(levelId) || !attempt) return state;
  const alreadyCompleted = state.completedLevelIds.includes(levelId);
  const score = attempt.score ?? null;

  /*
   * Records are kept apart from completion on purpose: replaying is always allowed and
   * always updates the latest result, but only a genuinely better run takes the record.
   */
  const bestResultsByLevelId =
    score === null
      ? state.bestResultsByLevelId
      : updateBestResults(state.bestResultsByLevelId, levelId, {
          score,
          correctRounds: attempt.correctRounds,
          totalRounds: attempt.totalRounds,
          elapsedMs: attempt.elapsedMs,
          attemptId: attempt.attemptId,
          completedAt: attempt.completedAt
        });

  return {
    ...state,
    completedLevelIds: alreadyCompleted ? state.completedLevelIds : [...state.completedLevelIds, levelId],
    onboarded: true,
    bestResultsByLevelId,
    lastResult: { levelId, ...attempt, score }
  };
}

export function isLevelCompleted(state: ProgressState, levelId: string): boolean {
  return isLevelId(levelId) && state.completedLevelIds.includes(levelId);
}

export function resetProgressState(): ProgressState {
  return initialProgressState;
}
