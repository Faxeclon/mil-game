import type { LevelId } from "@/features/levels/levelModel";
import { addProfilesInStore } from "@/features/progress/progressStore";
import { initialProgressState, type ProgressState } from "@/features/progress/progressState";

/**
 * Three ready-made children, so the grown-up's panel can be seen with something in it.
 *
 * They are written as real profiles rather than as a picture of profiles: the same shape
 * the game saves, so the progress bars, the stars and the streaks are all worked out the
 * usual way, and "play as" and "delete" do exactly what they will do for a real child.
 *
 * They exist only while developing. Shipping invented children would put names on a
 * screen a family is meant to recognise as their own, which is the one thing this panel
 * cannot afford to get wrong.
 */
export const SAMPLE_CHILDREN_FLAG = "kikiria.dev.sampleChildren.v1";

const attemptId = "attempt_123e4567-e89b-12d3-a456-426614174000";

/** The local calendar day, `days` back, in the format the streak stores. */
function dayBefore(today: Date, days: number): string {
  const day = new Date(today);
  day.setDate(day.getDate() - days);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${String(day.getDate()).padStart(2, "0")}`;
}

function bestRuns(levelIds: readonly LevelId[], score: number, today: Date) {
  return Object.fromEntries(
    levelIds.map((levelId) => [
      levelId,
      {
        score,
        correctRounds: 3,
        totalRounds: 3,
        elapsedMs: 21_000,
        attemptId,
        completedAt: today.toISOString()
      }
    ])
  );
}

type Sample = {
  nickname: string;
  avatar: ProgressState["apprenticeAvatarId"];
  done: LevelId[];
  score: number;
  streakDays: number;
  /** How many days ago they last played, which is what makes a streak alive or broken. */
  lastPlayed: number;
  minutes: number;
};

/* Three on purpose, and deliberately unalike: a full bar, a middling one and a first day
   with a broken streak. One child would only ever show the design in one state. */
const samples: readonly Sample[] = [
  {
    nickname: "Lucía",
    avatar: "owl",
    done: ["basics-1", "basics-2", "animals-1", "animals-2", "animals-3", "sports-1", "sports-2", "memes-1"],
    score: 900,
    streakDays: 5,
    lastPlayed: 0,
    minutes: 214
  },
  {
    nickname: "Beto",
    avatar: "fox",
    done: ["basics-1", "basics-2", "animals-1"],
    score: 700,
    streakDays: 1,
    lastPlayed: 1,
    minutes: 68
  },
  { nickname: "Kiara", avatar: "turtle", done: ["basics-1"], score: 430, streakDays: 0, lastPlayed: 9, minutes: 23 }
];

export function buildSampleChildren(guardianEmail: string, today: Date): ProgressState[] {
  return samples.map((sample) => ({
    ...initialProgressState,
    completedLevelIds: [...sample.done],
    mapOnboardingStage: "complete",
    onboarded: true,
    localNickname: sample.nickname,
    apprenticeAvatarId: sample.avatar,
    bestResultsByLevelId: bestRuns(sample.done, sample.score, today),
    streak: {
      currentDays: sample.streakDays,
      bestDays: Math.max(sample.streakDays, 5),
      lastPlayedOn: dayBefore(today, sample.lastPlayed)
    },
    guardian: { email: guardianEmail, authorizedOn: dayBefore(today, 20), syncPending: true },
    adultEmail: null,
    playedMs: sample.minutes * 60_000
  }));
}

/**
 * Puts them on the device once, and remembers having done so.
 *
 * Without the mark they would come back every time the panel was opened, which would make
 * deleting one impossible - and deleting is half of what this panel is here to let a
 * grown-up try.
 */
export function seedSampleChildren(guardianEmail: string, today: Date): void {
  if (process.env.NODE_ENV !== "development") return;
  // Marked per address, so every grown-up who signs in gets their own three to look at.
  const mark = `${SAMPLE_CHILDREN_FLAG}.${guardianEmail}`;
  try {
    if (window.localStorage.getItem(mark)) return;
    window.localStorage.setItem(mark, "done");
  } catch {
    // A browser that refuses storage simply does not get the samples.
    return;
  }
  addProfilesInStore(buildSampleChildren(guardianEmail, today));
}
