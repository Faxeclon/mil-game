"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef, useState } from "react";
import { Camera, Sparkles, Timer, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import {
  dealRush,
  getRushAccuracy,
  initialRushState,
  rushReducer,
  RUSH_SECONDS,
  type RushItem
} from "@/features/rush/rushState";
import type { CategoryKey, IslandKey } from "@/features/levels/levelModel";
import { getActiveBonusForIsland, getBonusDestinationPath, getBonusRushSecondsLeft, type BonusOpportunity, type BonusRushRun } from "@/features/bonus/bonusOpportunity";
import { useProgress } from "@/features/progress/ProgressProvider";
import { useRouter } from "@/i18n/navigation";
import { ImageZoom } from "./ImageZoom";
import { useRushCompletionRetention } from "./RushRouteGuard";
import styles from "./RushClient.module.css";

function restoreDeck(pool: readonly RushItem[], itemIds: readonly string[] | undefined): RushItem[] {
  if (!itemIds) return [];
  const byId = new Map(pool.map((item) => [item.id, item]));
  return itemIds.flatMap((id) => byId.get(id) ?? []);
}

function getRushStateFromRun(run: BonusRushRun | undefined) {
  if (!run) return initialRushState;
  if (run.finished) return { status: "finished" as const, correct: run.correct, wrong: run.wrong, ranOut: run.ranOut };
  return { status: "playing" as const, index: run.index, correct: run.correct, wrong: run.wrong, lastAnswer: null };
}

function saveRunProgress(run: BonusRushRun, state: ReturnType<typeof getRushStateFromRun>): BonusRushRun {
  if (state.status === "finished") {
    return { ...run, index: run.deckItemIds.length, correct: state.correct, wrong: state.wrong, finished: true, ranOut: state.ranOut };
  }
  if (state.status === "playing") {
    return { ...run, index: state.index, correct: state.correct, wrong: state.wrong };
  }
  return run;
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
  poolsByCategory
}: {
  island: IslandKey;
  poolsByCategory: Partial<Record<CategoryKey, readonly RushItem[]>>;
}) {
  const t = useTranslations("rush");
  const tTutorial = useTranslations("tutorial");
  const tEducation = useTranslations("education");
  const router = useRouter();
  const retainCompletedBonus = useRushCompletionRetention();
  const { progressState, consumeBonusOpportunity, startBonusRushRun, updateBonusRushRun } = useProgress();
  const activeBonus = getActiveBonusForIsland(progressState, island);
  const [runBonus] = useState<BonusOpportunity | null>(() => activeBonus ?? null);
  const consumedRunRef = useRef(false);
  const startedRunRef = useRef(Boolean(activeBonus?.rushRun));

  const bonus = activeBonus ?? runBonus;
  const pool = bonus ? poolsByCategory[bonus.categoryKey] ?? [] : [];
  const run = bonus?.rushRun;
  const [state, dispatch] = useReducer(rushReducer, run, getRushStateFromRun);
  const [deck, setDeck] = useState<RushItem[]>(() => restoreDeck(pool, run?.deckItemIds));
  const [secondsLeft, setSecondsLeft] = useState(() => run ? getBonusRushSecondsLeft(run.startedAt, RUSH_SECONDS) : RUSH_SECONDS);

  const isPlaying = state.status === "playing";

  // One interval for the whole run: the clock belongs to the run, not to each image.
  useEffect(() => {
    if (!isPlaying || !run) return;
    const tick = () => {
      const remaining = getBonusRushSecondsLeft(run.startedAt, RUSH_SECONDS);
      setSecondsLeft(remaining);
      if (remaining === 0) dispatch({ type: "timeUp" });
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [isPlaying, run]);

  // The guard keeps this mounted just long enough to show the score after consumption.
  useEffect(() => {
    if (state.status !== "finished" || !bonus || consumedRunRef.current) return;
    consumedRunRef.current = true;
    if (bonus.rushRun) updateBonusRushRun(bonus.id, saveRunProgress(bonus.rushRun, state));
    retainCompletedBonus(bonus.id);
    consumeBonusOpportunity(bonus.id);
  }, [bonus, consumeBonusOpportunity, retainCompletedBonus, state, updateBonusRushRun]);

  const beginRun = () => {
    if (!bonus || bonus.rushRun || startedRunRef.current) return;
    const nextDeck = dealRush(pool);
    if (nextDeck.length === 0) return;
    startedRunRef.current = true;
    startBonusRushRun(bonus.id, {
      runId: `${bonus.id}:run`,
      startedAt: Date.now(),
      deckItemIds: nextDeck.map((item) => item.id),
      index: 0,
      correct: 0,
      wrong: 0,
      finished: false,
      ranOut: false
    });
    setDeck(nextDeck);
    setSecondsLeft(RUSH_SECONDS);
    dispatch({ type: "restart" });
    dispatch({ type: "start" });
  };

  const abandonBonus = () => {
    if (!bonus) return;
    if (!consumedRunRef.current) {
      consumedRunRef.current = true;
      consumeBonusOpportunity(bonus.id);
    }
    router.push(getBonusDestinationPath(bonus.destination));
  };

  const answer = (saidAi: boolean, item: RushItem) => {
    if (!bonus?.rushRun) return;
    const action = { type: "answer" as const, saidAi, item, total: deck.length };
    const next = rushReducer(state, action);
    if (next === state) return;
    dispatch(action);
    updateBonusRushRun(bonus.id, saveRunProgress(bonus.rushRun, next));
  };

  if (!bonus) return null;

  if (state.status === "lobby") {
    return (
      <section aria-labelledby="rush-title" className={styles.rush}>
        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="welcoming" priority />
        <h1 className={styles.title} id="rush-title">
          {t("title")}
        </h1>
        <p className={styles.lead}>{t("lead", { seconds: RUSH_SECONDS })}</p>
        <p className={styles.warning}>{t("bonusChallenge")}</p>
        <button className={styles.primary} type="button" onClick={beginRun}>
          {t("start")}
        </button>
        <button className={styles.secondary} type="button" onClick={abandonBonus}>
          {t("exit")}
        </button>
      </section>
    );
  }

  if (state.status === "finished") {
    const accuracy = getRushAccuracy(state.correct, state.wrong);

    return (
      <section aria-labelledby="rush-title" className={styles.rush}>
        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="celebrating" priority />
        <h1 className={styles.title} id="rush-title">
          {t("finished")}
        </h1>
        <p className={styles.bigScore}>{t("caught", { count: state.correct })}</p>
        <p className={styles.lead}>{t("accuracy", { percent: accuracy })}</p>
        {!state.ranOut && <p className={styles.warning}>{t("ranOutOfImages")}</p>}
        <p className={styles.warning}>{tEducation("remember")}</p>
        <button className={styles.primary} type="button" onClick={abandonBonus}>
          {t("bonusFinish")}
        </button>
      </section>
    );
  }

  const item = deck[state.index];
  if (!item) return null;

  return (
    <section aria-labelledby="rush-question" className={styles.rush}>
      <p className={styles.hud}>
        <span className={secondsLeft <= 5 ? styles.clockLow : styles.clock}>
          <Timer aria-hidden="true" size={15} />
          {t("secondsLeft", { seconds: secondsLeft })}
        </span>
        <span className={styles.tally}>{t("tally", { correct: state.correct, wrong: state.wrong })}</span>
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

      <div aria-labelledby="rush-question" className={styles.answers} role="group">
        <button
          className={styles.answerAi}
          type="button"
          onClick={() => answer(true, item)}
        >
          <Sparkles aria-hidden="true" size={18} />
          {tTutorial("answerAi")}
        </button>
        <button
          className={styles.answerCamera}
          type="button"
          onClick={() => answer(false, item)}
        >
          <Camera aria-hidden="true" size={18} />
          {tTutorial("answerCamera")}
        </button>
      </div>

      <p className={styles.hint}>
        <Zap aria-hidden="true" size={13} />
        {t("hint")}
      </p>
      <button className={styles.secondary} type="button" onClick={abandonBonus}>
        {t("exit")}
      </button>
    </section>
  );
}
