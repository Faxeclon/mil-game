import { categories, islands, missionBlueprint, isLevelId, type CategoryKey, type IslandKey, type LevelId } from "@/features/levels/levelModel";
import { bonusWheelRewards, type BonusOpportunity, type BonusRushRun, type BonusWheelState } from "@/features/bonus/bonusOpportunity";
import { normalizeAdultEmail } from "@/features/adults/adultAccount";
import { isApprenticeAvatarId, type ApprenticeAvatarId } from "@/features/profile/apprenticeAvatar";
import { normalizeLocalNickname } from "@/features/profile/localNickname";
import { isAttemptId, parseCompletedAt, parseElapsedMs } from "./attemptMetadata";
import { parseBestResults, updateBestResults, type BestResultsByLevelId } from "./bestResults";
import { parseLevelScore } from "@/features/scoring/levelScore";
import { RUSH_SECONDS } from "@/features/rush/rushState";
import { isAchievementId, type AchievementId } from "@/features/achievements/achievementModel";
import { initialStreak, isPlayedOn, parseStreak, recordPlayedDay, type Streak } from "./streak";
import {
  grantGuardianConsent,
  parseGuardianConsent,
  type GuardianConsent
} from "@/features/guardian/guardianConsent";

export const PROGRESS_VERSION = 1;
export const mapOnboardingStages = ["map-island", "island-first-level", "complete"] as const;
export type MapOnboardingStage = (typeof mapOnboardingStages)[number];

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
  /** Replay-only progress for already completed sections; it never unlocks anything. */
  sectionReplayIdsByCategory?: Partial<Record<CategoryKey, LevelId[]>>;
  /** The one attempt that just closed a section, so a replay cannot farm another event. */
  sectionCompletionEvent?: { categoryKey: CategoryKey; attemptId: string };
  /** Bonus records belong to this profile because the whole state belongs to it. */
  bonusOpportunities: BonusOpportunity[];
  /** Earned Bonus achievement IDs; labels and icons are always localized separately. */
  achievementIds: AchievementId[];
  /** Earned achievements whose single celebration has not yet been acknowledged. */
  pendingAchievementCelebrationIds: AchievementId[];
  /** Whether this profile has already seen that its first medal is saved on this device. */
  localMedalNoticePresented: boolean;
  /** Legacy v1 data retained on load; it has no effect on Bonus Rush access. */
  rushUnlockedIslands: IslandKey[];
  /** The number of missions that formed this player's rank scale when it was last earned. */
  rankMissionCeiling: number;
  /** Only profiles created after map onboarding existed may need its one-time guide. */
  mapOnboardingStage: MapOnboardingStage;
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
  /**
   * The grown-up whose own game this is, or null when the profile belongs to a child.
   *
   * A teacher or a parent already said who they are when they signed in, so asking them
   * to invent a nickname and pick an apprentice before they may play is asking the same
   * question twice. Their address is kept here for one reason: so their own game is never
   * counted among the children they look after.
   */
  adultEmail: string | null;
  /**
   * Time spent inside missions, in milliseconds, added up as they are finished.
   *
   * Stored rather than derived because the records only keep each mission's best run, so
   * adding those up would quietly under-report a child who played the same mission five
   * times - and under-reporting is the one direction this number must not be wrong in
   * when a parent is reading it to decide whether their child is on the phone too long.
   */
  playedMs: number;
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
  /** Completion and unlocking require a strict majority of correct answers. */
  passed: boolean;
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

/** A tie is not enough: every mission needs a strict majority, regardless of its length. */
export function didPassLevelAttempt(correctRounds: number, totalRounds: number): boolean {
  return Number.isFinite(correctRounds) && Number.isFinite(totalRounds) && totalRounds > 0 && correctRounds > totalRounds / 2;
}

export const initialProgressState: ProgressState = {
  version: PROGRESS_VERSION,
  completedLevelIds: [],
  bonusOpportunities: [],
  achievementIds: [],
  pendingAchievementCelebrationIds: [],
  localMedalNoticePresented: false,
  rushUnlockedIslands: [],
  rankMissionCeiling: playableMissionCount,
  mapOnboardingStage: "map-island",
  localNickname: null,
  apprenticeAvatarId: null,
  bestResultsByLevelId: {},
  streak: initialStreak,
  guardian: null,
  adultEmail: null,
  playedMs: 0
};

/**
 * Starts the game over for the child already holding the phone.
 *
 * The distinction that makes this correct is that there are two different onboardings in
 * here, and only one of them is progress:
 *
 *   `onboarded`          they created a profile   - kept, or the game asks their name again
 *   `mapOnboardingStage` the one-time map tour    - replayed, since the map is new again
 *
 * Wiping the whole state was the old behaviour, and it took the nickname with it, which is
 * why erasing progress could end up looking like losing your account. Everything that is
 * genuinely progress goes; who you are, and how you like to be spoken to, stays.
 *
 * The Rush rewards go too. They are stored rather than derived precisely so a reward
 * already earned survives new content, and that same durability would otherwise let them
 * survive a reset the child deliberately asked for.
 */
export function resetProgressKeepingProfile(state: ProgressState): ProgressState {
  return {
    ...initialProgressState,
    // Who they are, kept exactly as it was.
    localNickname: state.localNickname,
    apprenticeAvatarId: state.apprenticeAvatarId,
    onboarded: state.onboarded,
    // Consent belongs to the adult who gave it, not to a run of the game.
    guardian: state.guardian,
    // This is an explanation about this profile, not progress that should repeat after a reset.
    localMedalNoticePresented: state.localMedalNoticePresented,
    // Whose game this is survives too, or a grown-up's reset would turn them into a child.
    adultEmail: state.adultEmail
  };
}

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
    score: parseLevelScore(value.score),
    // This remains derived even after persistence, so a stale boolean can never bypass
    // the strict-majority rule.
    passed: didPassLevelAttempt(Math.min(Math.max(Math.trunc(correctRounds), 0), Math.trunc(totalRounds)), Math.trunc(totalRounds))
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

/** A negative or nonsensical total is read as no time at all, never as a guess. */
function parsePlayedMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0;
  return Math.trunc(value);
}

function parseCompletedLevelIds(value: unknown): LevelId[] {
  if (!Array.isArray(value)) return [];
  const completed = new Set<LevelId>();
  for (const levelId of value) {
    if (isLevelId(levelId)) completed.add(levelId);
  }
  return [...completed];
}

function parseAchievementIds(value: unknown): AchievementId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isAchievementId))];
}

function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === "string" && categories.some((category) => category.key === value);
}

function parseSectionReplayIds(value: unknown): Partial<Record<CategoryKey, LevelId[]>> {
  if (!isRecord(value)) return {};
  const parsed: Partial<Record<CategoryKey, LevelId[]>> = {};
  for (const [categoryKey, ids] of Object.entries(value)) {
    if (!isCategoryKey(categoryKey) || !Array.isArray(ids)) continue;
    parsed[categoryKey] = ids.filter(isLevelId);
  }
  return parsed;
}

function parseSectionCompletionEvent(value: unknown): ProgressState["sectionCompletionEvent"] {
  if (!isRecord(value) || !isCategoryKey(value.categoryKey) || !isAttemptId(value.attemptId)) return undefined;
  return { categoryKey: value.categoryKey, attemptId: value.attemptId };
}

function parseBonusRushRun(value: unknown): BonusRushRun | undefined {
  if (!isRecord(value) || typeof value.runId !== "string" || value.runId.length === 0) return undefined;
  if (typeof value.startedAt !== "number" || !Number.isFinite(value.startedAt) || value.startedAt < 0) return undefined;
  if (!Array.isArray(value.deckItemIds) || value.deckItemIds.length === 0 || value.deckItemIds.length > 100) return undefined;
  if (!value.deckItemIds.every((item) => typeof item === "string" && item.length > 0)) return undefined;
  if (new Set(value.deckItemIds).size !== value.deckItemIds.length) return undefined;
  const index = value.index;
  const rawCorrectCount = value.rawCorrectCount ?? value.correct;
  const actualMistakeCount = value.actualMistakeCount ?? value.wrong;
  const visibleMistakeCount = value.visibleMistakeCount ?? value.wrong;
  const durationSeconds = value.durationSeconds ?? RUSH_SECONDS;
  const score = value.score ?? rawCorrectCount;
  const reward = typeof value.reward === "string" && bonusWheelRewards.includes(value.reward as (typeof bonusWheelRewards)[number])
    ? value.reward as (typeof bonusWheelRewards)[number]
    : "none";
  if (
    typeof index !== "number" || !Number.isInteger(index) || index < 0 ||
    typeof rawCorrectCount !== "number" || !Number.isInteger(rawCorrectCount) || rawCorrectCount < 0 ||
    typeof actualMistakeCount !== "number" || !Number.isInteger(actualMistakeCount) || actualMistakeCount < 0 ||
    typeof visibleMistakeCount !== "number" || !Number.isInteger(visibleMistakeCount) || visibleMistakeCount < 0 ||
    typeof durationSeconds !== "number" || !Number.isInteger(durationSeconds) || durationSeconds < RUSH_SECONDS ||
    typeof score !== "number" || !Number.isInteger(score) || score < 0
  ) return undefined;
  if (index > value.deckItemIds.length) return undefined;
  if (typeof value.finished !== "boolean" || typeof value.ranOut !== "boolean") return undefined;
  return {
    runId: value.runId,
    startedAt: value.startedAt,
    reward,
    deckItemIds: [...value.deckItemIds],
    index,
    durationSeconds,
    rawCorrectCount,
    actualMistakeCount,
    visibleMistakeCount,
    shieldUsed: value.shieldUsed === true,
    score,
    finished: value.finished,
    ranOut: value.ranOut
  };
}

function parseBonusWheel(value: unknown): BonusWheelState | undefined {
  if (!isRecord(value)) return undefined;
  if (value.status === "pending" && value.rerollUsed === false) return { status: "pending", rerollUsed: false };
  if (value.status === "reroll" && value.rerollUsed === true) return { status: "reroll", rerollUsed: true };
  if (
    value.status === "resolved" &&
    typeof value.rerollUsed === "boolean" &&
    typeof value.reward === "string" &&
    bonusWheelRewards.includes(value.reward as (typeof bonusWheelRewards)[number])
  ) {
    return { status: "resolved", rerollUsed: value.rerollUsed, reward: value.reward as (typeof bonusWheelRewards)[number] };
  }
  return undefined;
}

function parseBonusOpportunities(value: unknown): BonusOpportunity[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((entry): BonusOpportunity[] => {
    if (!isRecord(entry) || typeof entry.id !== "string" || seen.has(entry.id)) return [];
    if (!isCategoryKey(entry.categoryKey) || !isIslandKey(entry.islandKey)) return [];
    if (entry.status !== "pending" && entry.status !== "active" && entry.status !== "consumed") return [];
    if (!isRecord(entry.destination) || (entry.destination.kind !== "worlds" && entry.destination.kind !== "island")) return [];
    if (entry.destination.kind === "island" && !isIslandKey(entry.destination.islandKey)) return [];
    const rushRun = entry.status === "active" ? parseBonusRushRun(entry.rushRun) : undefined;
    const wheel = entry.status === "active" ? parseBonusWheel(entry.wheel) : undefined;
    seen.add(entry.id);
    return [{
      id: entry.id,
      categoryKey: entry.categoryKey,
      islandKey: entry.islandKey,
      destination: entry.destination.kind === "worlds" ? { kind: "worlds" } : { kind: "island", islandKey: entry.destination.islandKey as IslandKey },
      status: entry.status,
      ...(wheel ? { wheel } : {}),
      ...(rushRun ? { rushRun } : {})
    }];
  });
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
  const achievementIds = parseAchievementIds(value.achievementIds);
  const pendingAchievementCelebrationIds = parseAchievementIds(value.pendingAchievementCelebrationIds)
    .filter((id) => achievementIds.includes(id));
  const localMedalNoticePresented = value.localMedalNoticePresented === true;

  return {
    version: PROGRESS_VERSION,
    completedLevelIds,
    ...(Object.keys(parseSectionReplayIds(value.sectionReplayIdsByCategory)).length > 0
      ? { sectionReplayIdsByCategory: parseSectionReplayIds(value.sectionReplayIdsByCategory) }
      : {}),
    ...(parseSectionCompletionEvent(value.sectionCompletionEvent)
      ? { sectionCompletionEvent: parseSectionCompletionEvent(value.sectionCompletionEvent) }
      : {}),
    bonusOpportunities: parseBonusOpportunities(value.bonusOpportunities),
    achievementIds,
    pendingAchievementCelebrationIds,
    localMedalNoticePresented,
    rushUnlockedIslands: storedRushUnlocks,
    rankMissionCeiling: Math.max(completedLevelIds.length, storedCeiling),
    // Missing means a profile predates this optional onboarding and must not be interrupted.
    mapOnboardingStage: mapOnboardingStages.includes(value.mapOnboardingStage as MapOnboardingStage)
      ? value.mapOnboardingStage as MapOnboardingStage
      : value.mapOnboardingCompleted === false ? "map-island" : "complete",
    // Finishing anything proves the player already went through onboarding.
    ...(value.onboarded === true || completedLevelIds.length > 0
      ? { onboarded: true }
      : {}),
    localNickname: localNickname ?? null,
    apprenticeAvatarId,
    bestResultsByLevelId: parseBestResults(value.bestResultsByLevelId),
    streak: parseStreak(value.streak),
    guardian: parseGuardianConsent(value.guardian),
    // Missing means a child's profile, which is what every profile was before this existed.
    adultEmail: normalizeAdultEmail(value.adultEmail),
    // Absent for everybody who played before it was counted; nothing is invented for them.
    playedMs: parsePlayedMs(value.playedMs),
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

/**
 * Turns a grown-up's sign-in into a player, without asking them anything.
 *
 * They already answered the only question this game asks - who are you - when they typed
 * their address, so a nickname form afterwards would be the same question a second time.
 * The name they play under comes from that address, and the address itself is recorded so
 * their game is never mistaken for one of the children they look after.
 */
export function playAsAdult(state: ProgressState, email: unknown, nickname: string): ProgressState {
  const adultEmail = normalizeAdultEmail(email);
  const localNickname = normalizeLocalNickname(nickname);
  if (!adultEmail || !localNickname) return state;
  if (state.adultEmail === adultEmail && state.onboarded === true && state.localNickname === localNickname) {
    return state;
  }
  return { ...markOnboarded(state, localNickname), adultEmail };
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
  const passed = didPassLevelAttempt(attempt.correctRounds, attempt.totalRounds);
  const mission = missionBlueprint.find((entry) => entry.id === levelId);
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

  const completedLevelIds = alreadyCompleted || !passed ? state.completedLevelIds : [...state.completedLevelIds, levelId];
  const replayIdsByCategory = { ...(state.sectionReplayIdsByCategory ?? {}) };
  let sectionCompletionEvent: ProgressState["sectionCompletionEvent"];
  if (mission && passed) {
    const categoryMissions = missionBlueprint.filter((entry) => entry.category === mission.category && entry.packId);
    const categoryWasCompleted = categoryMissions.every((entry) => state.completedLevelIds.includes(entry.id as LevelId));
    const categoryIsCompleted = categoryMissions.every((entry) => completedLevelIds.includes(entry.id as LevelId));
    if (!categoryWasCompleted && categoryIsCompleted && categoryMissions.at(-1)?.id === levelId) {
      sectionCompletionEvent = { categoryKey: mission.category, attemptId: attempt.attemptId };
    } else if (categoryWasCompleted) {
      const replayed = replayIdsByCategory[mission.category] ?? [];
      const expected = categoryMissions[replayed.length]?.id;
      const next = expected === levelId
        ? [...replayed, levelId]
        : categoryMissions[0]?.id === levelId ? [levelId] : [];
      if (next.length === categoryMissions.length) {
        sectionCompletionEvent = { categoryKey: mission.category, attemptId: attempt.attemptId };
        replayIdsByCategory[mission.category] = [];
      } else {
        replayIdsByCategory[mission.category] = next;
      }
    }
  }
  const newlyCompletedIslands = completedIslands(completedLevelIds);

  return {
    ...state,
    completedLevelIds,
    ...(state.sectionReplayIdsByCategory !== undefined || Object.keys(replayIdsByCategory).length > 0
      ? { sectionReplayIdsByCategory: replayIdsByCategory }
      : {}),
    ...(sectionCompletionEvent ? { sectionCompletionEvent } : {}),
    rushUnlockedIslands: [...new Set([...state.rushUnlockedIslands, ...newlyCompletedIslands])],
    rankMissionCeiling: Math.max(state.rankMissionCeiling, completedLevelIds.length),
    // Every run counts, including the replays a record ignores: this is time spent, not
    // a score, and a child who played the same mission five times did spend that time.
    playedMs: state.playedMs + Math.max(attempt.elapsedMs, 0),
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
      score,
      passed
    }
  };
}

/** Completing the guided map step is separate from missions and never changes progress. */
export function advanceMapOnboarding(state: ProgressState): ProgressState {
  const next = state.mapOnboardingStage === "map-island" ? "island-first-level" : "complete";
  return state.mapOnboardingStage === next ? state : { ...state, mapOnboardingStage: next };
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

/** This local-storage explanation is shown once per profile, not once per result. */
export function markLocalMedalNoticePresented(state: ProgressState): ProgressState {
  return state.localMedalNoticePresented ? state : { ...state, localMedalNoticePresented: true };
}

/** Unlinking leaves every medal untouched; only the link goes away. */
export function withdrawGuardian(state: ProgressState): ProgressState {
  if (state.guardian === null) return state;
  return { ...state, guardian: null };
}
