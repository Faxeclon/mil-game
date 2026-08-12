"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { playSound } from "@/features/audio/soundEffects";
import { Narrator } from "@/components/Narrator";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import type { DecisionPack } from "@/content/schemas/decision";
import { ActiveResponseTimer } from "@/features/game/activeResponseTimer";
import type { LevelId } from "@/features/levels/levelModel";
import { createAttemptMetadata } from "@/features/progress/attemptMetadata";
import type { LevelAttempt } from "@/features/progress/progressState";
import { useProgress } from "@/features/progress/ProgressProvider";
import { getResultsAttemptPath } from "@/features/results/resultNavigation";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./DecisionClient.module.css";

type DecisionClientProps = {
  pack: DecisionPack;
  levelId: LevelId;
  chipLabel: string;
};

function monotonicNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

/**
 * Missions that ask what to do, not what something is.
 *
 * Every other screen in this game ends at a judgement about a picture. This one starts
 * where that leaves off: a message has arrived, a friend has shared something, a poster is
 * ready to publish - and the child chooses an action. It is the half of media literacy the
 * game was missing, and the half that survives whatever the next image generator can do.
 *
 * There is no score here beyond the same completion every mission records, and the reason
 * for the shape below matters: after answering, the child reads why *every* option helps
 * or does not. Being told only that somebody else's answer was better teaches nothing
 * about their own reasoning.
 */
export function DecisionClient({ pack, levelId, chipLabel }: DecisionClientProps) {
  const t = useTranslations("decisions");
  const tTutorial = useTranslations("tutorial");
  const router = useRouter();
  const { completeLevel } = useProgress();

  const [roundIndex, setRoundIndex] = useState(0);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [responseTimer] = useState(() => new ActiveResponseTimer());
  const recordedRef = useRef(false);

  const round = pack.rounds[roundIndex];
  const total = pack.rounds.length;

  useEffect(() => {
    if (finished || !round) return;
    responseTimer.startRound(round.id, monotonicNow());
  }, [finished, responseTimer, round]);

  // Written before navigating, so the results screen can demand this exact attempt.
  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    const attempt: LevelAttempt = {
      correctRounds: correctCount,
      totalRounds: total,
      elapsedMs: responseTimer.getElapsedMs(),
      ...createAttemptMetadata()
    };
    completeLevel(levelId, attempt);
    router.replace(getResultsAttemptPath(attempt.attemptId));
  }, [completeLevel, correctCount, finished, levelId, responseTimer, router, total]);

  if (finished) {
    return (
      <p className={styles.handover} role="status">
        {tTutorial("savingResult")}
      </p>
    );
  }

  const chosen = round.options.find((option) => option.id === chosenId) ?? null;
  const answer = round.options.find((option) => option.id === round.answerId);
  const isRight = answered && chosenId === round.answerId;

  const confirm = () => {
    if (!chosenId || answered) return;
    responseTimer.finishRound(round.id, monotonicNow());
    const right = chosenId === round.answerId;
    if (right) setCorrectCount((count) => count + 1);
    setAnswered(true);
    playSound(right ? "correct" : "wrong");
  };

  const advance = () => {
    if (roundIndex + 1 >= total) {
      setFinished(true);
      return;
    }
    setRoundIndex((index) => index + 1);
    setChosenId(null);
    setAnswered(false);
  };

  return (
    <section aria-labelledby="decision-question" className={`${styles.round} tutorial-round`}>
      <header className={styles.header}>
        <Link className={styles.headerLink} href="/worlds">
          <ChevronLeft aria-hidden="true" size={20} />
          <span>{t("exit")}</span>
        </Link>
        <p className={styles.progress}>{t("roundOf", { current: round.order, total })}</p>
      </header>

      <div aria-hidden="true" className={styles.track}>
        <span style={{ width: `${(round.order / total) * 100}%` }} />
      </div>

      <div className={styles.board} key={round.id}>
        <p className={styles.chip}>{chipLabel}</p>

        {/*
         * Read aloud in full, and this screen needs it more than any other: a situation is
         * three lines of text with no picture to lean on, and a child who cannot read it
         * cannot answer at all.
         */}
        <Narrator
          lines={[t(round.situationKey), t(round.questionKey), ...round.options.map((o) => t(o.labelKey))]}
        />

        <div className={styles.situation}>
          <MascotSlot alt={tTutorial("mascotAlt")} className={styles.mascot} mood="thinking" priority />
          <p className={styles.situationText}>{t(round.situationKey)}</p>
        </div>

        <h1 className={styles.question} id="decision-question">
          {t(round.questionKey)}
        </h1>

        <ul className={styles.options}>
          {round.options.map((option) => {
            const isChosen = chosenId === option.id;
            const isAnswer = option.id === round.answerId;
            const shown = answered && (isChosen || isAnswer);

            return (
              <li key={option.id}>
                <button
                  aria-pressed={isChosen}
                  className={[
                    styles.option,
                    isChosen ? styles.optionChosen : "",
                    answered && isAnswer ? styles.optionRight : "",
                    answered && isChosen && !isAnswer ? styles.optionMiss : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={answered}
                  type="button"
                  onClick={() => setChosenId(option.id)}
                >
                  <span className={styles.optionLabel}>
                    {t(option.labelKey)}
                    {/* Never colour alone: the tick says which one it was. */}
                    {answered && isAnswer && <Check aria-hidden="true" size={16} />}
                  </span>
                  {/*
                    Why, for the option they picked and for the one that helps most. A
                    child who chose wrongly needs to know what was wrong with their
                    reasoning, not only that another answer existed.
                  */}
                  {shown && <span className={styles.optionWhy}>{t(option.whyKey)}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {!answered ? (
          <button className={styles.primary} disabled={!chosenId} type="button" onClick={confirm}>
            {t("confirm")}
          </button>
        ) : (
          <div className={styles.feedback} role="status">
            <p className={styles.verdict}>{isRight ? t("right") : t("wrong")}</p>
            {!isRight && answer && <p className={styles.best}>{t(answer.labelKey)}</p>}
            <p className={styles.remember}>
              <Lightbulb aria-hidden="true" size={15} />
              {t(round.rememberKey)}
            </p>
            <button autoFocus className={styles.primary} type="button" onClick={advance}>
              {roundIndex + 1 >= total ? t("finish") : t("next")}
            </button>
          </div>
        )}

        {chosen && !answered && <p className={styles.hint}>{t("choose")}</p>}
      </div>
    </section>
  );
}
