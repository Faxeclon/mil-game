"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef, useState } from "react";
import { Accessibility, Check, ChevronLeft, Sparkles, Target, Timer as TimerIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { LookAskCheck } from "@/components/LookAskCheck";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import { ActiveResponseTimer } from "@/features/game/activeResponseTimer";
import {
  createRoundDeadline,
  crossedFinalWarning,
  getCountdownProgress,
  getDisplayedRemainingSeconds,
  getRemainingMs,
  hasTimedOut,
  RoundClosureGuard,
  type RoundDeadline
} from "@/features/game/roundCountdown";
import { Link, useRouter } from "@/i18n/navigation";
import type { TutorialPack } from "@/content/schemas/tutorial";
import type { LevelId } from "@/features/levels/levelModel";
import { useProgress } from "@/features/progress/ProgressProvider";
import { createAttemptMetadata } from "@/features/progress/attemptMetadata";
import type { LevelAttempt } from "@/features/progress/progressState";
import { getResultsAttemptPath } from "@/features/results/resultNavigation";
import { createInitialTutorialState, tutorialReducer } from "@/features/game/tutorialState";
import {
  getChoicePresentation,
  getFeedbackBlocks,
  getLearningStepStates,
  type ChoiceVisualState
} from "@/features/game/tutorialPresentation";
import styles from "./TutorialClient.module.css";

type TutorialClientProps = {
  pack: TutorialPack;
  /** Which mission of the map this run belongs to. */
  levelId: LevelId;
  /** Label of the chip shown during play, for example "Animales · Misión 1". */
  chipLabel: string;
  /** What the mission asks, shown on the entry card: the mode name. */
  entryTitle: string;
  /** Difficulty, and the time limit when the mode has one. */
  entryMeta: string;
  /** Only the very first mission of the game explains itself before starting. */
  showBriefing?: boolean;
  /** Seconds allowed per round. Set only by timed missions; omit for an untimed one. */
  secondsPerRound?: number;
};

const cardStateClass: Record<ChoiceVisualState, string> = {
  idle: "",
  selected: styles.cardSelected,
  ai: styles.cardAi,
  mistake: styles.cardMistake,
  neutral: styles.cardNeutral
};

type CountdownState = { roundId: string; remainingMs: number; progress: number };
type TimerAnnouncement = { roundId: string; kind: "warning" | "expired" };

function monotonicNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

export function TutorialClient({
  pack,
  levelId,
  chipLabel,
  entryTitle,
  entryMeta,
  showBriefing = false,
  secondsPerRound
}: TutorialClientProps) {
  const t = useTranslations("tutorial");
  const router = useRouter();
  const { completeLevel } = useProgress();
  const [state, dispatch] = useReducer(tutorialReducer, createInitialTutorialState(showBriefing));
  const [briefingIndex, setBriefingIndex] = useState(0);
  const [responseTimer] = useState(() => new ActiveResponseTimer());
  const [roundClosure] = useState(() => new RoundClosureGuard());
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [timerAnnouncement, setTimerAnnouncement] = useState<TimerAnnouncement | null>(null);
  const completionAttemptRef = useRef<LevelAttempt | null>(null);
  const hasRecordedCompletionRef = useRef(false);
  const warningRoundRef = useRef<string | null>(null);
  const roundDeadlineRef = useRef<RoundDeadline | null>(null);

  const briefingLines = t.raw("briefing") as string[];
  const isFinished = state.status === "completed";
  const correctRounds = state.status === "completed" ? state.correctRounds : 0;
  const totalRounds = pack.rounds.length;

  const isPlaying = state.status === "playing";
  const roundIndex = state.status === "playing" ? state.roundIndex : -1;
  const answerSubmitted = state.status === "playing" ? state.answerSubmitted : false;
  const activeRoundId = isPlaying ? pack.rounds[roundIndex].id : null;
  const timedDurationMs = typeof secondsPerRound === "number" && Number.isFinite(secondsPerRound) && secondsPerRound > 0
    ? Math.trunc(secondsPerRound * 1_000)
    : null;
  const isRoundTimed = timedDurationMs !== null && isPlaying && !answerSubmitted;

  // A round starts counting only once its answer controls are interactive. Timed
  // rounds use this same moment to create their fixed deadline.
  useEffect(() => {
    if (!isPlaying || answerSubmitted || !activeRoundId) return;
    const startedAt = monotonicNow();
    responseTimer.startRound(activeRoundId, startedAt);

    if (timedDurationMs === null) {
      roundDeadlineRef.current = null;
      roundClosure.startRound(activeRoundId);
      warningRoundRef.current = null;
      return;
    }
    const existingDeadline = roundDeadlineRef.current?.roundId === activeRoundId
      ? roundDeadlineRef.current
      : null;
    const deadline = existingDeadline ?? createRoundDeadline(activeRoundId, startedAt, timedDurationMs);
    if (!deadline) {
      setCountdown(null);
      return;
    }
    if (!existingDeadline) {
      roundDeadlineRef.current = deadline;
      roundClosure.startRound(activeRoundId);
      warningRoundRef.current = null;
    }

    let mounted = true;
    let previousRemainingMs: number | null = null;
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    const setSnapshot = (remainingMs: number) => {
      if (!mounted) return;
      setCountdown({
        roundId: activeRoundId,
        remainingMs,
        progress: getCountdownProgress(deadline, deadline.deadlineMs - remainingMs)
      });
    };
    const closeAsTimedOut = () => {
      if (!mounted || !roundClosure.tryClose(activeRoundId)) return;
      responseTimer.finishTimedOutRound(activeRoundId, timedDurationMs);
      setSnapshot(0);
      setTimerAnnouncement({ roundId: activeRoundId, kind: "expired" });
      dispatch({ type: "timeout" });
    };
    const update = () => {
      if (!mounted || roundClosure.isClosed(activeRoundId)) return;
      const remainingMs = getRemainingMs(deadline, monotonicNow());
      setSnapshot(remainingMs);
      if (warningRoundRef.current !== activeRoundId && crossedFinalWarning(previousRemainingMs, remainingMs)) {
        warningRoundRef.current = activeRoundId;
        setTimerAnnouncement({ roundId: activeRoundId, kind: "warning" });
      }
      previousRemainingMs = remainingMs;
      if (hasTimedOut(remainingMs)) closeAsTimedOut();
    };
    const scheduleDeadlineCheck = () => {
      const remainingMs = getRemainingMs(deadline, monotonicNow());
      deadlineTimer = setTimeout(() => {
        update();
        if (mounted && !roundClosure.isClosed(activeRoundId)) scheduleDeadlineCheck();
      }, Math.max(0, remainingMs));
    };

    update();
    const refreshTimer = setInterval(update, 250);
    scheduleDeadlineCheck();
    return () => {
      mounted = false;
      clearInterval(refreshTimer);
      if (deadlineTimer) clearTimeout(deadlineTimer);
    };
  }, [activeRoundId, answerSubmitted, isPlaying, responseTimer, roundClosure, timedDurationMs]);

  // Persist the attempt before navigating so the destination can require this exact id.
  useEffect(() => {
    if (!isFinished || hasRecordedCompletionRef.current) return;
    hasRecordedCompletionRef.current = true;
    const metadata = createAttemptMetadata();
    const attempt = completionAttemptRef.current ?? {
      correctRounds,
      totalRounds,
      elapsedMs: responseTimer.getElapsedMs(),
      ...metadata
    };
    completionAttemptRef.current = attempt;
    completeLevel(levelId, {
      ...attempt
    });
    router.replace(getResultsAttemptPath(attempt.attemptId));
  }, [completeLevel, correctRounds, isFinished, levelId, responseTimer, router, totalRounds]);

  if (state.status === "intro" && !showBriefing) {
    /*
     * Every mission announces itself before it starts, so a child always knows what they
     * are about to enter. Only the very first one replaces this with the long briefing.
     */
    return (
      <button
        className={`${styles.intro} app-chrome-hidden`}
        type="button"
        onClick={() => dispatch({ type: "start" })}
      >
        <span className={styles.introStage}>
          <span className={styles.introChip}>
            <Target aria-hidden="true" size={13} />
            {chipLabel}
          </span>

          <span className={styles.introBubble}>
            <span className={styles.entryLabel}>{t("entering")}</span>
            <span className={styles.introLine}>{entryTitle}</span>
            <span className={styles.entryMeta}>{entryMeta}</span>
          </span>

          <MascotSlot alt={t("mascotAlt")} className={styles.introMascot} mood="welcoming" priority />

          <span aria-hidden="true" className={styles.introHint}>
            {t("tapToStart")}
          </span>
        </span>
      </button>
    );
  }

  if (state.status === "intro") {
    const isLastLine = briefingIndex >= briefingLines.length - 1;

    return (
      /* Same full-screen conversation as the home intro: Roqui takes the middle of the
         screen, a tap anywhere moves on, and the last one starts round one. */
      <button
        aria-label={t("briefingAria", { current: briefingIndex + 1, total: briefingLines.length })}
        className={`${styles.intro} app-chrome-hidden`}
        type="button"
        onClick={() =>
          isLastLine ? dispatch({ type: "start" }) : setBriefingIndex((index) => index + 1)
        }
      >
        <span className={styles.introStage}>
          <span className={styles.introChip}>
            <Target aria-hidden="true" size={13} />
            {chipLabel}
          </span>

          <span className={styles.introBubble} key={briefingIndex}>
            <span className={styles.introLine}>{briefingLines[briefingIndex]}</span>
          </span>

          <MascotSlot alt={t("mascotAlt")} className={styles.introMascot} mood="welcoming" priority />

          <span aria-hidden="true" className={styles.introDots}>
            {briefingLines.map((line, index) => (
              <span
                className={`${styles.introDot} ${index <= briefingIndex ? styles.introDotSeen : ""}`}
                key={line}
              />
            ))}
          </span>

          <span aria-hidden="true" className={styles.introHint}>
            {isLastLine ? t("tapToStart") : t("tapHint")}
          </span>
        </span>

        <span aria-live="polite" className={styles.srOnly}>
          {briefingLines[briefingIndex]}
        </span>
      </button>
    );
  }

  if (state.status === "completed") {
    // The results screen owns the celebration; this is only the hand-over moment.
    return (
      <p className={styles.handover} role="status">
        {t("savingResult")}
      </p>
    );
  }

  const round = pack.rounds[state.roundIndex];
  const selectedChoice = round.choices.find((choice) => choice.id === state.selectedChoiceId);
  const selectedIsCorrect = selectedChoice?.id === round.correctChoiceId;
  const isFinalRound = round.order === pack.rounds.length;
  const feedbackBlocks = getFeedbackBlocks(round);
  const countdownForRound = countdown?.roundId === round.id ? countdown : null;
  const announcementForRound = timerAnnouncement?.roundId === round.id ? timerAnnouncement.kind : null;
  const visibleTimer = timedDurationMs !== null && (isRoundTimed || announcementForRound === "expired");

  return (
    // "tutorial-round" is only a hook for the existing global rule that hides the
    // app header during a round; all styling lives in the module.
    <section aria-labelledby="tutorial-question" className={`${styles.round} tutorial-round`}>
      <header className={styles.header}>
        <Link className={styles.headerLink} href="/worlds">
          <ChevronLeft aria-hidden="true" size={20} />
          <span>{t("exit")}</span>
        </Link>
        <p className={styles.headerProgress}>{t("progress", { current: round.order, total: pack.rounds.length })}</p>
        <Link className={styles.headerLink} href="/settings">
          <Accessibility aria-hidden="true" size={18} />
          <span>{t("settings")}</span>
        </Link>
      </header>

      <div aria-hidden="true" className={styles.progressTrack}>
        <span style={{ width: `${(round.order / pack.rounds.length) * 100}%` }} />
      </div>

      {visibleTimer && (
        <div className={styles.timer}>
          <span className={styles.timerIcon}>
            <TimerIcon aria-hidden="true" size={15} />
          </span>
          <span className={styles.timerValue}>
            {announcementForRound === "expired"
              ? t("timeExpired")
              : getDisplayedRemainingSeconds(countdownForRound?.remainingMs ?? timedDurationMs) === 1
                ? t("timeRemainingOne")
                : t("timeRemaining", { seconds: getDisplayedRemainingSeconds(countdownForRound?.remainingMs ?? timedDurationMs) })}
          </span>
          <span aria-hidden="true" className={styles.timerTrack}>
            <span
              className={styles.timerFill}
              style={{ width: `${(countdownForRound?.progress ?? (announcementForRound === "expired" ? 0 : 1)) * 100}%` }}
            />
          </span>
        </div>
      )}
      {timedDurationMs !== null && (
        <>
          <span aria-atomic="true" aria-live="polite" className={styles.srOnly}>
            {announcementForRound === "warning" ? t("timeWarning") : ""}
          </span>
          <span aria-atomic="true" aria-live="assertive" className={styles.srOnly}>
            {announcementForRound === "expired" ? t("timeExpired") : ""}
          </span>
        </>
      )}

      <div className={`${styles.gameplay} ${state.answerSubmitted ? styles.gameplayFeedback : ""}`}>
        {/* Keying on the round id replays the entrance transition once per round. */}
        <div className={styles.board} key={round.id}>
          <p className={styles.missionChip}>{chipLabel}</p>
          <h1 className={styles.question} id="tutorial-question">
            {t(round.promptKey)}
          </h1>

          <div aria-labelledby="tutorial-question" className={styles.choices} role="group">
            {round.choices.map((choice) => {
              const selected = choice.id === state.selectedChoiceId;
              const isAiChoice = choice.id === round.correctChoiceId;
              const presentation = getChoicePresentation({
                answerSubmitted: state.answerSubmitted,
                selected,
                isAiChoice
              });
              const className = [
                styles.card,
                cardStateClass[presentation.state],
                state.answerSubmitted ? styles.cardLocked : ""
              ]
                .filter(Boolean)
                .join(" ");

              const position = t(choice.position);
              const description = t(choice.media.altKey);
              const cardStatus = state.answerSubmitted
                ? presentation.labels.map((label) => t(label)).join(". ")
                : selected
                  ? t("selected")
                  : "";

              return (
                <button
                  aria-label={[t("choiceAria", { position, description }), cardStatus].filter(Boolean).join(". ")}
                  aria-pressed={selected}
                  className={className}
                  disabled={state.answerSubmitted}
                  key={choice.id}
                  type="button"
                  onClick={() => dispatch({ type: "select", choiceId: choice.id })}
                >
                  <span className={styles.cardPosition}>{position}</span>
                  <span className={styles.cardMedia}>
                    <Image alt={description} fill sizes="(max-width: 700px) 45vw, 360px" src={choice.media.src} />
                    {selected && !state.answerSubmitted && (
                      <span aria-hidden="true" className={styles.selectedMark}>
                        <Check size={15} strokeWidth={3} />
                      </span>
                    )}
                    {state.answerSubmitted && isAiChoice && selectedIsCorrect && (
                      <>
                        <span aria-hidden="true" className={`${styles.spark} ${styles.sparkOne}`} />
                        <span aria-hidden="true" className={`${styles.spark} ${styles.sparkTwo}`} />
                        <span aria-hidden="true" className={`${styles.spark} ${styles.sparkThree}`} />
                      </>
                    )}
                  </span>

                  {presentation.labels.length > 0 && (
                    <span className={styles.cardLabels}>
                      {presentation.labels.map((label) => (
                        <span
                          className={`${styles.cardLabel} ${
                            label === "aiChoice"
                              ? styles.labelAi
                              : isAiChoice
                                ? styles.labelChoiceRight
                                : styles.labelChoiceWrong
                          }`}
                          key={label}
                        >
                          {label === "aiChoice" ? (
                            <Sparkles aria-hidden="true" size={13} />
                          ) : (
                            <Target aria-hidden="true" size={13} />
                          )}
                          {t(label)}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {state.answerSubmitted ? (
            <p className={styles.confirmedStatus}>
              <Check aria-hidden="true" size={15} strokeWidth={3} />
              {t("answerConfirmed")}
            </p>
          ) : (
            <div className={styles.actions}>
              <p>{state.selectedChoiceId === null ? t("selectPrompt") : t("selectedHint")}</p>
              <button
                className={styles.primaryButton}
                disabled={state.selectedChoiceId === null}
                type="button"
                onClick={() => {
                  if (!roundClosure.tryClose(round.id)) return;
                  responseTimer.finishRound(round.id, monotonicNow());
                  dispatch({ type: "submit", correct: selectedIsCorrect });
                }}
              >
                {t("submit")}
              </button>
            </div>
          )}
        </div>

        {state.answerSubmitted && (
          <div className={styles.panelDock}>
            <section aria-labelledby="feedback-title" aria-live="polite" className={styles.panel}>
              <header className={styles.panelHeader}>
                <MascotSlot
                  alt=""
                  className={`${styles.reaction} ${selectedIsCorrect ? styles.reactionCorrect : styles.reactionRetry}`}
                  mood={selectedIsCorrect ? "encouraging" : "thinking"}
                  size={96}
                />
                <p className={styles.panelTitle} id="feedback-title">
                  {selectedIsCorrect ? t("correct") : t("tryAgain")}
                </p>
              </header>

              <LookAskCheck compact states={getLearningStepStates(round.learningGoal)} />

              <div className={styles.panelBody}>
                {feedbackBlocks.map((block) => (
                  <p className={styles.clue} key={block.labelKey}>
                    <span className={styles.clueLabel}>{t(block.labelKey)}</span>
                    <span className={styles.clueText}>{t(block.textKey)}</span>
                  </p>
                ))}
              </div>

              <footer className={styles.panelFooter}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => dispatch({ type: "next", totalRounds: pack.rounds.length })}
                >
                  {isFinalRound ? t("finish") : t("next")}
                </button>
              </footer>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
