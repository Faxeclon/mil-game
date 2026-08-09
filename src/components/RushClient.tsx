"use client";

import Image from "next/image";
import { useEffect, useReducer, useState } from "react";
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
import type { IslandKey } from "@/features/levels/levelModel";
import { Link } from "@/i18n/navigation";
import { ImageZoom } from "./ImageZoom";
import styles from "./RushClient.module.css";

/**
 * The island's thirty-second challenge.
 *
 * It uses that island's own pictures, so it asks about material the child has already
 * met. It still awards no medals and unlocks nothing: speed makes a fun game and a poor
 * lesson, and the missions, where a child is asked to slow down and look, remain the
 * thing that counts.
 */
export function RushClient({ island, pool }: { island: IslandKey; pool: readonly RushItem[] }) {
  const t = useTranslations("rush");
  const tTutorial = useTranslations("tutorial");
  const tEducation = useTranslations("education");
  const [state, dispatch] = useReducer(rushReducer, initialRushState);
  const [deck, setDeck] = useState<RushItem[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(RUSH_SECONDS);

  const isPlaying = state.status === "playing";

  // One interval for the whole run: the clock belongs to the run, not to each image.
  useEffect(() => {
    if (!isPlaying) return;
    const startedAt = Date.now();
    const tick = () => {
      const remaining = Math.max(0, RUSH_SECONDS - Math.floor((Date.now() - startedAt) / 1_000));
      setSecondsLeft(remaining);
      if (remaining === 0) dispatch({ type: "timeUp" });
    };
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const beginRun = () => {
    setDeck(dealRush(pool));
    setSecondsLeft(RUSH_SECONDS);
    dispatch({ type: "restart" });
    dispatch({ type: "start" });
  };

  if (state.status === "lobby") {
    return (
      <section aria-labelledby="rush-title" className={styles.rush}>
        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="welcoming" priority />
        <h1 className={styles.title} id="rush-title">
          {t("title")}
        </h1>
        <p className={styles.lead}>{t("lead", { seconds: RUSH_SECONDS })}</p>
        <p className={styles.warning}>{t("notAMission")}</p>
        <button className={styles.primary} type="button" onClick={beginRun}>
          {t("start")}
        </button>
        <Link className={styles.secondary} href={`/island/${island}`}>
          {t("exit")}
        </Link>
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
        <button className={styles.primary} type="button" onClick={beginRun}>
          {t("again")}
        </button>
        <Link className={styles.secondary} href={`/island/${island}`}>
          {t("exit")}
        </Link>
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
          onClick={() => dispatch({ type: "answer", saidAi: true, item, total: deck.length })}
        >
          <Sparkles aria-hidden="true" size={18} />
          {tTutorial("answerAi")}
        </button>
        <button
          className={styles.answerCamera}
          type="button"
          onClick={() => dispatch({ type: "answer", saidAi: false, item, total: deck.length })}
        >
          <Camera aria-hidden="true" size={18} />
          {tTutorial("answerCamera")}
        </button>
      </div>

      <p className={styles.hint}>
        <Zap aria-hidden="true" size={13} />
        {t("hint")}
      </p>
    </section>
  );
}
