import { categories, islands, missionBlueprint, isLevelId, type IslandKey, type LevelId } from "@/features/levels/levelModel";
import { isApprenticeAvatarId, type ApprenticeAvatarId } from "@/features/profile/apprenticeAvatar";
import { normalizeLocalNickname } from "@/features/profile/localNickname";
import { isAttemptId, parseCompletedAt, parseElapsedMs } from "./attemptMetadata";
import { parseBestResults, updateBestResults, type BestResultsByLevelId } from "./bestResults";
import { parseLevelScore } from "@/features/scoring/levelScore";
import { initialStreak, isPlayedOn, parseStreak, recordPlayedDay, type Streak } from "./streak";
import {
  grantGuardianConsent,
  parseGuardianConsent,
  type GuardianConsent
} from "@/features/guardian/guardianConsent";

export const PROGRESS_VERSION = 1;

/** The published catalog before the four new content missions were added. */
const LEGACY_CATALOG_LEVEL_IDS: readonly LevelId[] = [
  "basics-1", "basics-2", "animals-1", "animals-2", "animals-3", "sports-1", "sports-2", "creators-1"
];

const playableMissionCount = missionBlueprint.filter((mission) => mission.packId).length;

function isIslandKey(value: unknown): value is IslandKey {
  return typeof value === "string" && islands.some((island) => island.key === value);
}

function completedIslands(levelIds: readonly LevelId[]): IslandKey[] {
  return islands.flatMap((island) => {
    const islandMissions = missionBlueprint.filter(
      (mission) => mission.packId && categories.find((category) => category.key === mission.category)?.island === island.key
    );
    return islandMissions.length > 0 && islandMissions.every((mission) => levelIds.includes(mission.id as LevelId))
      ? [island.key]
      : [];
  });
}

function legacyUnlockedIslands(levelIds: readonly LevelId[]): IslandKey[] {
  const legacyCompleted = new Set(levelIds.filter((levelId) => LEGACY_CATALOG_LEVEL_IDS.includes(levelId)));
  return islands.flatMap((island) => {
    const required = LEGACY_CATALOG_LEVEL_IDS.filter(
      (levelId) => {
        const mission = missionBlueprint.find((entry) => entry.id === levelId);
        return mission && categories.find((category) => category.key === mission.category)?.island === island.key;
      }
    );
    return required.length > 0 && required.every((levelId) => legacyCompleted.has(levelId)) ? [island.key] : [];
  });
}

/**
 * The only completion data persisted is the set of authored levels that were finished.
 * Everything the map needs - what is open and what remains closed - is derived from it.
 */
export type ProgressState = {
  version: typeof PROGRESS_VERSION;
  /** Levels finished, in the order they were finished. */
  completedLevelIds: LevelId[];
  /** A Rush reward already earned. It survives later catalog additions without inventing completions. */
  rushUnlockedIslands: IslandKey[];
  /** The number of missions that formed this player's rank scale when it was last earned. */
  rankMissionCeiling: number;
  /** Only profiles created after map onboarding existed may need its one-time guide. */
  mapOnboardingCompleted: boolean;
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
  /**
   * Days in a row with a finished mission. Kept apart from completion for the same
   * reason as records: it is an encouragement, never a condition for unlocking.
   */
  streak: Streak;
  /**
   * The adult who authorised this player, or null while they play as a guest.
   *
   * Kept per profile because consent is given for one child, not for a device: two
   * siblings on the same phone can perfectly well have one authorised and one not.
   */
  guardian: GuardianConsent | null;
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
  /** The player's local calendar day, supplied by the device that finished the mission. */
  playedOn?: string;
};

export const initialProgressState: ProgressState = {
  version: PROGRESS_VERSION,
  completedLevelIds: [],
  rushUnlockedIslands: [],
  rankMissionCeiling: playableMissionCount,
  mapOnboardingCompleted: false,
  localNickname: null,
  apprenticeAvatarId: null,
  bestResultsByLevelId: {},
  streak: initialStreak,
  guardian: null
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
    ...(parseLevelScore(value.score) === null ? {} : { score: parseLevelScore(value.score) as number }),
    // Absent when the device could not read its own calendar; the streak then stands still.
    ...(isPlayedOn(value.playedOn) ? { playedOn: value.playedOn } : {})
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

  const storedRushUnlocks = Array.isArray(value.rushUnlockedIslands)
    ? [...new Set(value.rushUnlockedIslands.filter(isIslandKey))]
    : legacyUnlockedIslands(completedLevelIds);
  const storedCeiling = typeof value.rankMissionCeiling === "number" && Number.isFinite(value.rankMissionCeiling)
    ? Math.trunc(value.rankMissionCeiling)
    : Array.isArray(value.completedLevelIds) || Array.isArray(value.completedMissionIds)
      ? Math.max(LEGACY_CATALOG_LEVEL_IDS.length, completedLevelIds.length)
      : playableMissionCount;

  return {
    version: PROGRESS_VERSION,
    completedLevelIds,
    rushUnlockedIslands: storedRushUnlocks,
    rankMissionCeiling: Math.max(completedLevelIds.length, storedCeiling),
    // Missing means a profile predates this optional onboarding and must not be interrupted.
    mapOnboardingCompleted: value.mapOnboardingCompleted !== false,
    // Finishing anything proves the player already went through onboarding.
    ...(value.onboarded === true || completedLevelIds.length > 0
      ? { onboarded: true }
      : {}),
    localNickname: localNickname ?? null,
    apprenticeAvatarId,
    bestResultsByLevelId: parseBestResults(value.bestResultsByLevelId),
    streak: parseStreak(value.streak),
    guardian: parseGuardianConsent(value.guardian),
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

  const completedLevelIds = alreadyCompleted ? state.completedLevelIds : [...state.completedLevelIds, levelId];
  const newlyCompletedIslands = completedIslands(completedLevelIds);

  return {
    ...state,
    completedLevelIds,
    rushUnlockedIslands: [...new Set([...state.rushUnlockedIslands, ...newlyCompletedIslands])],
    rankMissionCeiling: Math.max(state.rankMissionCeiling, completedLevelIds.length),
    onboarded: true,
    bestResultsByLevelId,
    // Replaying on the same day is welcome but adds nothing: a streak counts days, not runs.
    streak: attempt.playedOn ? recordPlayedDay(state.streak, attempt.playedOn) : state.streak,
    /*
     * Built field by field rather than spread from the attempt: the attempt also carries
     * the local day, which belongs to the streak and not to a result. Spreading it in
     * stored something the reader does not restore, so a saved state and a reloaded one
     * quietly disagreed.
     */
    lastResult: {
      levelId,
      attemptId: attempt.attemptId,
      correctRounds: attempt.correctRounds,
      totalRounds: attempt.totalRounds,
      elapsedMs: attempt.elapsedMs,
      completedAt: attempt.completedAt,
      score
    }
  };
}

/** Completing the guided map step is separate from missions and never changes progress. */
export function completeMapOnboarding(state: ProgressState): ProgressState {
  return state.mapOnboardingCompleted ? state : { ...state, mapOnboardingCompleted: true };
}

export function isLevelCompleted(state: ProgressState, levelId: string): boolean {
  return isLevelId(levelId) && state.completedLevelIds.includes(levelId);
}

export function resetProgressState(): ProgressState {
  return initialProgressState;
}

/**
 * Links this player to the responsible adult who said yes.
 *
 * Consent changes nothing about the game: the same missions, the same medals, the same
 * device. What it changes is what may leave the device later, which is why it is stored
 * next to the progress rather than gating any of it.
 */
export function authorizeGuardian(state: ProgressState, email: string, authorizedOn: string): ProgressState {
  const guardian = grantGuardianConsent(email, authorizedOn);
  if (!guardian) return state;
  return { ...state, guardian };
}

/** Unlinking leaves every medal untouched; only the link goes away. */
export function withdrawGuardian(state: ProgressState): ProgressState {
  if (state.guardian === null) return state;
  return { ...state, guardian: null };
}
