"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef, useState } from "react";
import { Camera, Shield, Sparkles, Timer, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import {
  dealRush,
  getRushAccuracy,
  getBonusRushDuration,
  getBonusRushScore,
  initialRushState,
  rushReducer,
  type RushItem
} from "@/features/rush/rushState";
import type { IslandKey } from "@/features/levels/levelModel";
import { getActiveBonusForIsland, getBonusDestinationPath, getBonusRushSecondsLeft, type BonusOpportunity, type BonusRushRun, type BonusWheelReward } from "@/features/bonus/bonusOpportunity";
import { useProgress } from "@/features/progress/ProgressProvider";
import { useRouter } from "@/i18n/navigation";
import { ImageZoom } from "./ImageZoom";
import { useRushCompletionRetention } from "./RushRouteGuard";
import { BonusRewardWheel } from "./BonusRewardWheel";
import { BonusAchievementCelebration } from "./BonusAchievementCelebration";
import { getBonusRunAchievementIds, type AchievementId } from "@/features/achievements/achievementModel";
import { isShieldActivation, SHIELD_FEEDBACK_MS } from "@/features/rush/shieldFeedback";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import { getBonusFlowStage } from "@/features/bonus/bonusFlow";
import styles from "./RushClient.module.css";

function restoreDeck(pool: readonly RushItem[], itemIds: readonly string[] | undefined): RushItem[] {
  if (!itemIds) return [];
  const byId = new Map(pool.map((item) => [item.id, item]));
  return itemIds.flatMap((id) => byId.get(id) ?? []);
}

function getRushStateFromRun(run: BonusRushRun | undefined) {
  if (!run) return initialRushState;
  if (run.finished) return { status: "finished" as const, rawCorrectCount: run.rawCorrectCount, actualMistakeCount: run.actualMistakeCount, visibleMistakeCount: run.visibleMistakeCount, shieldUsed: run.shieldUsed, ranOut: run.ranOut };
  return { status: "playing" as const, index: run.index, rawCorrectCount: run.rawCorrectCount, actualMistakeCount: run.actualMistakeCount, visibleMistakeCount: run.visibleMistakeCount, shieldUsed: run.shieldUsed, lastAnswer: null };
}

function saveRunProgress(run: BonusRushRun, state: ReturnType<typeof getRushStateFromRun>, reward: BonusWheelReward): BonusRushRun {
  if (state.status === "finished") {
    return { ...run, index: run.deckItemIds.length, rawCorrectCount: state.rawCorrectCount, actualMistakeCount: state.actualMistakeCount, visibleMistakeCount: state.visibleMistakeCount, shieldUsed: state.shieldUsed, score: getBonusRushScore(state.rawCorrectCount, reward), finished: true, ranOut: state.ranOut };
  }
  if (state.status === "playing") {
    return { ...run, index: state.index, rawCorrectCount: state.rawCorrectCount, actualMistakeCount: state.actualMistakeCount, visibleMistakeCount: state.visibleMistakeCount, shieldUsed: state.shieldUsed, score: getBonusRushScore(state.rawCorrectCount, reward) };
  }
  return run;
}

function rewardKey(reward: BonusWheelReward): "extraLife" | "doublePoints" | "extra15" | "extra10" | "none" {
  if (reward === "extra-life") return "extraLife";
  if (reward === "double-points") return "doublePoints";
  if (reward === "extra-15") return "extra15";
  if (reward === "extra-10") return "extra10";
  return "none";
}

function BonusRewardChip({ reward, shieldUsed }: { reward: BonusWheelReward; shieldUsed: boolean }) {
  const t = useTranslations("rush");
  if (reward === "none") return null;
  const label = reward === "extra-life" && shieldUsed ? t("shieldUsed") : t(`wheelRewards.${rewardKey(reward)}`);
  return <span className={styles.rewardChip}>{reward === "extra-life" ? <Shield aria-hidden="true" size={15} /> : reward.startsWith("extra-") ? <Timer aria-hidden="true" size={15} /> : <Sparkles aria-hidden="true" size={15} />}{label}</span>;
}

/**
 * The island's thirty-second challenge.
 *
 * It uses that island's own pictures, so it asks about material the child has already
 * met. It still awards no medals and unlocks nothing: speed makes a fun game and a poor
 * lesson, and the missions, where a child is asked to slow down and look, remain the
 * thing that counts.
 */
export function RushClient({
  island,
  pool
}: {
  island: IslandKey;
  pool: readonly RushItem[];
}) {
  const t = useTranslations("rush");
  const tTutorial = useTranslations("tutorial");
  const tEducation = useTranslations("education");
  const { reducedMotion } = useAccessibility();
  const router = useRouter();
  const retainCompletedBonus = useRushCompletionRetention();
  const { progressState, consumeBonusOpportunity, startBonusRushRun, updateBonusRushRun, unlockAchievements } = useProgress();
  const activeBonus = getActiveBonusForIsland(progressState, island);
  const [runBonus] = useState<BonusOpportunity | null>(() => activeBonus ?? null);
  const consumedRunRef = useRef(false);
  const finalizedRunRef = useRef(false);
  const startedRunRef = useRef(Boolean(activeBonus?.rushRun));
  const shieldFeedbackLockRef = useRef(false);
  const shieldFeedbackTimerRef = useRef<number | null>(null);
  const answersRef = useRef<HTMLDivElement>(null);

  const bonus = activeBonus ?? runBonus;
  const run = bonus?.rushRun;
  const reward: BonusWheelReward = run?.reward ?? (bonus?.wheel?.status === "resolved" ? bonus.wheel.reward : "none");
  const durationSeconds = run?.durationSeconds ?? getBonusRushDuration(reward);
  const [state, dispatch] = useReducer(rushReducer, run, getRushStateFromRun);
  const [deck, setDeck] = useState<RushItem[]>(() => restoreDeck(pool, run?.deckItemIds));
  const [secondsLeft, setSecondsLeft] = useState(() => run ? getBonusRushSecondsLeft(run.startedAt, durationSeconds) : durationSeconds);
  // A resolved prize is already acknowledged after a refresh, while a fresh spin still
  // waits for its visible Continue action in this mounted visit.
  const [wheelAcknowledged, setWheelAcknowledged] = useState(Boolean(run || activeBonus?.wheel?.status === "resolved"));
  const [newAchievementIds, setNewAchievementIds] = useState<AchievementId[]>([]);
  const [shieldFeedbackVisible, setShieldFeedbackVisible] = useState(false);
  const flowStage = getBonusFlowStage(bonus, wheelAcknowledged);

  const isPlaying = state.status === "playing";

  useEffect(() => () => {
    if (shieldFeedbackTimerRef.current) clearTimeout(shieldFeedbackTimerRef.current);
  }, []);

  // One interval for the whole run: the clock belongs to the run, not to each image.
  useEffect(() => {
    if (!isPlaying || !run) return;
    const tick = () => {
      const remaining = getBonusRushSecondsLeft(run.startedAt, run.durationSeconds);
      setSecondsLeft(remaining);
      if (remaining === 0) dispatch({ type: "timeUp" });
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [isPlaying, run]);

  // The finished run remains active through its result and any achievement celebration.
  // It is consumed only when the player leaves through the final CTA.
  useEffect(() => {
    if (state.status !== "finished" || !bonus || finalizedRunRef.current) return;
    finalizedRunRef.current = true;
    if (bonus.rushRun) {
      const completedRun = saveRunProgress(bonus.rushRun, state, reward);
      updateBonusRushRun(bonus.id, completedRun);
      const unlocked = unlockAchievements(getBonusRunAchievementIds({
        islandKey: bonus.islandKey,
        actualMistakeCount: completedRun.actualMistakeCount,
        reward: completedRun.reward
      }));
      // Persist before showing the one-visit celebration; a refresh finds no new IDs.
      if (unlocked.length > 0) window.setTimeout(() => setNewAchievementIds(unlocked), 0);
    }
  }, [bonus, reward, state, unlockAchievements, updateBonusRushRun]);

  const beginRun = () => {
    if (!bonus || bonus.wheel?.status !== "resolved" || !wheelAcknowledged || bonus.rushRun || startedRunRef.current) return;
    const nextDeck = dealRush(pool);
    if (nextDeck.length === 0) return;
    startedRunRef.current = true;
    startBonusRushRun(bonus.id, {
      runId: `${bonus.id}:run`,
      startedAt: Date.now(),
      reward,
      durationSeconds,
      deckItemIds: nextDeck.map((item) => item.id),
      index: 0,
      rawCorrectCount: 0,
      actualMistakeCount: 0,
      visibleMistakeCount: 0,
      shieldUsed: false,
      score: 0,
      finished: false,
      ranOut: false
    });
    setDeck(nextDeck);
    setSecondsLeft(durationSeconds);
    dispatch({ type: "restart" });
    dispatch({ type: "start" });
  };

  const leaveBonus = () => {
    if (!bonus) return;
    if (!consumedRunRef.current) {
      consumedRunRef.current = true;
      retainCompletedBonus(bonus.id);
      consumeBonusOpportunity(bonus.id);
    }
    router.push(getBonusDestinationPath(bonus.destination));
  };

  const answer = (saidAi: boolean, item: RushItem) => {
    if (!bonus?.rushRun || shieldFeedbackLockRef.current) return;
    const action = { type: "answer" as const, saidAi, item, total: deck.length, reward };
    const next = rushReducer(state, action);
    if (next === state) return;
    if (isShieldActivation(state, next)) {
      shieldFeedbackLockRef.current = true;
      setShieldFeedbackVisible(true);
      shieldFeedbackTimerRef.current = window.setTimeout(() => {
        shieldFeedbackLockRef.current = false;
        setShieldFeedbackVisible(false);
        answersRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
      }, reducedMotion ? 240 : SHIELD_FEEDBACK_MS);
    }
    dispatch(action);
    updateBonusRushRun(bonus.id, saveRunProgress(bonus.rushRun, next, reward));
  };

  if (!bonus || flowStage === "closed") return null;

  if (flowStage === "wheel") {
    return <BonusRewardWheel bonus={bonus} onContinue={() => setWheelAcknowledged(true)} />;
  }

  if (flowStage === "lobby") {
    return (
      <section aria-labelledby="rush-title" className={styles.rush}>
        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="welcoming" priority />
        <h1 className={styles.title} id="rush-title">
          {t("title")}
        </h1>
        <p className={styles.lead}>{t("lead", { seconds: durationSeconds })}</p>
        <p className={styles.warning}>{t("bonusChallenge")}</p>
        <BonusRewardChip reward={reward} shieldUsed={false} />
        <button className={styles.primary} type="button" onClick={beginRun}>
          {t("start")}
        </button>
        <button className={styles.secondary} type="button" onClick={leaveBonus}>
          {t("exit")}
        </button>
      </section>
    );
  }

  if (flowStage === "result" && state.status === "finished") {
    const accuracy = getRushAccuracy(state.rawCorrectCount, state.actualMistakeCount);
    const score = getBonusRushScore(state.rawCorrectCount, reward);

    return (
      <section aria-labelledby="rush-title" className={styles.rush}>
        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="celebrating" priority />
        <h1 className={styles.title} id="rush-title">
          {t("finished")}
        </h1>
        <p className={styles.bigScore}>{t("caught", { count: state.rawCorrectCount })}</p>
        <p className={styles.rewardScore}>{t("bonusScore", { score })}</p>
        <p className={styles.lead}>{t("accuracy", { percent: accuracy })}</p>
        {!state.ranOut && <p className={styles.warning}>{t("ranOutOfImages")}</p>}
        <p className={styles.warning}>{tEducation("remember")}</p>
        <button className={styles.primary} type="button" onClick={leaveBonus}>
          {t("bonusFinish")}
        </button>
        {newAchievementIds.length > 0 && <BonusAchievementCelebration ids={newAchievementIds} onContinue={leaveBonus} />}
      </section>
    );
  }

  if (state.status !== "playing") return null;

  const item = deck[state.index];
  if (!item) return null;

  return (
    <section aria-labelledby="rush-question" className={styles.rush}>
      <p className={styles.hud}>
        <span className={secondsLeft <= 5 ? styles.clockLow : styles.clock}>
          <Timer aria-hidden="true" size={15} />
          {t("secondsLeft", { seconds: secondsLeft })}
        </span>
        <span className={styles.tally}>{t("tally", { correct: state.rawCorrectCount, wrong: state.visibleMistakeCount })}</span>
        <BonusRewardChip reward={reward} shieldUsed={state.shieldUsed} />
      </p>

      {/* The countdown is announced only at the very end, so it never chatters. */}
      <span aria-atomic="true" aria-live="assertive" className={styles.srOnly}>
        {secondsLeft === 0 ? t("timeUp") : ""}
      </span>

      <h1 className={styles.question} id="rush-question">
        {t("question")}
      </h1>

      <figure className={`${styles.figure} ${state.lastAnswer ? styles[state.lastAnswer] : ""}`} key={item.id}>
        <Image alt={tTutorial(item.altKey)} fill priority sizes="(max-width: 700px) 82vw, 380px" src={item.src} />
        {/* The clock keeps running while it is open, and that is the honest trade: looking
            closer costs seconds, and deciding whether it is worth it is part of the game. */}
        <ImageZoom
          alt={tTutorial(item.altKey)}
          closeSignal={secondsLeft === 0 ? 1 : 0}
          src={item.src}
          timer={{ label: t("secondsLeft", { seconds: secondsLeft }), warning: secondsLeft <= 5 }}
        />
      </figure>

      <div aria-labelledby="rush-question" className={styles.answers} ref={answersRef} role="group">
        <button
          className={styles.answerAi}
          disabled={shieldFeedbackVisible}
          type="button"
          onClick={() => answer(true, item)}
        >
          <Sparkles aria-hidden="true" size={18} />
          {tTutorial("answerAi")}
        </button>
        <button
          className={styles.answerCamera}
          disabled={shieldFeedbackVisible}
          type="button"
          onClick={() => answer(false, item)}
        >
          <Camera aria-hidden="true" size={18} />
          {tTutorial("answerCamera")}
        </button>
      </div>

      {shieldFeedbackVisible && (
        <div aria-atomic="true" aria-live="assertive" className={`${styles.shieldFeedback} ${reducedMotion ? styles.shieldFeedbackStill : ""}`} role="status">
          <Shield aria-hidden="true" size={58} strokeWidth={2.5} />
          <strong>{t("shieldActivated")}</strong>
          <span>{t("shieldRetry")}</span>
        </div>
      )}

      <p className={styles.hint}>
        <Zap aria-hidden="true" size={13} />
        {t("hint")}
      </p>
      <button className={styles.secondary} type="button" onClick={leaveBonus}>
        {t("exit")}
      </button>
    </section>
  );
}
