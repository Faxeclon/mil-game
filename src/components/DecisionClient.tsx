"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Lightbulb, MessageSquareWarning, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { playSound } from "@/features/audio/soundEffects";
import { Narrator } from "@/components/Narrator";
import type { DecisionPack } from "@/content/schemas/decision";
import { ActiveResponseTimer } from "@/features/game/activeResponseTimer";
import type { LevelId } from "@/features/levels/levelModel";
import { createAttemptMetadata } from "@/features/progress/attemptMetadata";
import type { LevelAttempt } from "@/features/progress/progressState";
import { useProgress } from "@/features/progress/ProgressProvider";
import { getResultsAttemptPath } from "@/features/results/resultNavigation";
import { calculateLevelScore, type RoundOutcome } from "@/features/scoring/levelScore";
import { Link, useRouter } from "@/i18n/navigation";
import { preloadFeedbackRoqui } from "@/features/mascot/feedbackRoqui";
import styles from "./DecisionClient.module.css";

type DecisionClientProps = {
  pack: DecisionPack;
  levelId: LevelId;
  chipLabel: string;
  /** Roqui explains the island before its first mission, the way he does before mission one. */
  showBriefing?: boolean;
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
export function DecisionClient({ pack, levelId, chipLabel, showBriefing = false }: DecisionClientProps) {
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
  const [briefingIndex, setBriefingIndex] = useState(0);
  /*
   * One outcome per situation, so this mission is scored on the same scale as every other.
   *
   * Kept as a list rather than a running total because that is what the shared calculator
   * takes, and because it means the rule here cannot drift from the rule elsewhere: no
   * clock, so a right answer is worth full marks and speed earns nothing.
   */
  const [outcomes, setOutcomes] = useState<RoundOutcome[]>([]);
  const recordedRef = useRef(false);

  const briefingLines = t.raw("briefing") as string[];
  const briefingOpen = showBriefing && briefingIndex < briefingLines.length;

  const round = pack.rounds[roundIndex];
  const total = pack.rounds.length;

  // The clock starts when the first situation is actually on screen, never while Roqui is
  // still explaining: time spent listening is not time spent deciding.
  useEffect(() => {
    if (finished || !round || briefingOpen) return;
    responseTimer.startRound(round.id, monotonicNow());
  }, [briefingOpen, finished, responseTimer, round]);

  // Written before navigating, so the results screen can demand this exact attempt.
  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    const attempt: LevelAttempt = {
      correctRounds: correctCount,
      totalRounds: total,
      elapsedMs: responseTimer.getElapsedMs(),
      score: calculateLevelScore(outcomes),
      ...createAttemptMetadata()
    };
    completeLevel(levelId, attempt);
    router.replace(getResultsAttemptPath(attempt.attemptId));
  }, [completeLevel, correctCount, finished, levelId, outcomes, responseTimer, router, total]);

  useEffect(() => {
    preloadFeedbackRoqui();
  }, []);

  if (finished) {
    return (
      <p className={styles.handover} role="status">
        {tTutorial("savingResult")}
      </p>
    );
  }

  /*
   * Roqui says what this island is, before it starts.
   *
   * It earns the interruption in a way the other islands would not: everywhere else the
   * screen explains itself, because there is a picture and a question about it. Here a
   * child arrives at a wall of text with no image and no idea why, and "there is nothing
   * to look at" is precisely the thing that has to be said out loud.
   */
  if (briefingOpen) {
    const line = briefingLines[briefingIndex];

    return (
      <section className={`${styles.round} tutorial-round`}>
        <button
          aria-label={t("briefingAria", { current: briefingIndex + 1, total: briefingLines.length })}
          className={styles.briefing}
          type="button"
          onClick={() => setBriefingIndex((index) => index + 1)}
        >
          {/* Roqui first in the markup, drawn under the bubble - same as in a situation. */}
          <span className={styles.situation}>
            <span className={styles.stand}>
              <Image
                alt={tTutorial("mascotAlt")}
                className={styles.mascot}
                height={512}
                priority
                src="/media/mascot/roqui-map-left.png"
                width={512}
              />
            </span>
            <span className={styles.bubble} key={briefingIndex}>
              <span className={styles.situationText}>{line}</span>
            </span>
          </span>

          <span aria-hidden="true" className={styles.dots}>
            {briefingLines.map((_, index) => (
              <span className={index <= briefingIndex ? styles.dotSeen : ""} key={index} />
            ))}
          </span>

          <span aria-hidden="true" className={styles.hint}>
            {briefingIndex >= briefingLines.length - 1 ? t("briefingStart") : t("briefingNext")}
          </span>
        </button>

        <Narrator lines={[line]} />
      </section>
    );
  }

  const answer = round.options.find((option) => option.id === round.answerId);
  const isRight = answered && chosenId === round.answerId;

  const confirm = () => {
    if (!chosenId || answered) return;
    responseTimer.finishRound(round.id, monotonicNow());
    const right = chosenId === round.answerId;
    if (right) setCorrectCount((count) => count + 1);
    setOutcomes((list) => [...list, right ? { result: "correct" } : { result: "incorrect" }]);
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

      {/* One bead per situation, so a child sees how much is left without reading a number. */}
      <ol aria-hidden="true" className={styles.track}>
        {pack.rounds.map((entry) => (
          <li
            className={entry.order < round.order ? styles.beadDone : entry.order === round.order ? styles.beadNow : ""}
            key={entry.id}
          />
        ))}
      </ol>

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

        {/*
         * Drawn as a message that just arrived, because that is what it is. A child meets
         * these situations on a screen with a notification on it, not as an exercise, and
         * the shape is doing the same work the photograph does everywhere else: it says
         * what kind of thing you are looking at before a single word is read.
         */}
        <div className={styles.situation}>
          {/*
           * The map's Roqui, not the avatar one.
           *
           * The avatar artwork carries its own coloured tile because it is drawn to sit
           * inside a rounded frame. Standing on a page there is no frame to fill, so the
           * tile reads as a green box behind him. This is the same character cut out, the
           * one who already walks the island trail.
           */}
          <div className={styles.stand}>
            <Image
              alt={tTutorial("mascotAlt")}
              className={styles.mascot}
              height={512}
              priority
              src="/media/mascot/roqui-map-left.png"
              width={512}
            />
          </div>
          <div className={styles.bubble}>
            <p className={styles.bubbleTag}>
              <MessageSquareWarning aria-hidden="true" size={14} />
              {t("incoming")}
            </p>
            <p className={styles.situationText}>{t(round.situationKey)}</p>
          </div>
        </div>

        <h1 className={styles.question} id="decision-question">
          {t(round.questionKey)}
        </h1>

        {/* The prompt belongs above the options: below the button it is read too late. */}
        {!answered && <p className={styles.hint}>{t("choose")}</p>}

        <ul className={styles.options}>
          {round.options.map((option, index) => {
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
                    answered && isRight && isAnswer ? styles.optionSuccess : "",
                    answered && isChosen && !isAnswer ? styles.optionMiss : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={answered}
                  type="button"
                  onClick={() => {
                    setChosenId(option.id);
                    // The same tick the wheel uses: short, quiet, and it confirms the tap
                    // landed on a screen where nothing else moves when you touch it.
                    playSound("wheelTick");
                  }}
                >
                  <span className={styles.optionLabel}>
                    {/*
                     * Never colour alone. Before answering the marker is just the option's
                     * letter; afterwards it becomes a tick or a cross, so the outcome is
                     * readable in greyscale and by somebody who cannot tell red from green.
                     */}
                    <span aria-hidden="true" className={styles.marker}>
                      {answered && isAnswer ? (
                        <Check size={16} strokeWidth={3} />
                      ) : answered && isChosen ? (
                        <X size={16} strokeWidth={3} />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </span>
                    <span className={styles.optionText}>{t(option.labelKey)}</span>
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
          <div className={`${styles.feedback} ${isRight ? styles.feedbackRight : styles.feedbackMiss}`} role="status">
            <header className={styles.feedbackHeader}>
              <Image
                alt=""
                className={styles.feedbackRoqui}
                height={64}
                src={isRight ? "/media/ui/roqui-feedback/roqui-success.png" : "/media/ui/roqui-feedback/roqui-oops.png"}
                width={64}
              />
              <p className={styles.verdict}>{isRight ? t("right") : t("wrong")}</p>
            </header>
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
      </div>
    </section>
  );
}
