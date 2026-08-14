"use client";

import Image from "next/image";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Check, ChevronLeft, Sparkles, Target, Timer as TimerIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { playSound } from "@/features/audio/soundEffects";
import { Narrator } from "@/components/Narrator";
import { LookAskCheck } from "@/components/LookAskCheck";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import { preloadFeedbackRoqui } from "@/features/mascot/feedbackRoqui";
import { ActiveResponseTimer } from "@/features/game/activeResponseTimer";
import {
  createRoundDeadline,
  crossedFinalWarning,
  getCountdownProgress,
  getDisplayedRemainingSeconds,
  getRemainingMs,
  hasTimedOut,
  InitialNarrationCountdownGate,
  RoundClosureGuard,
  type RoundDeadline
} from "@/features/game/roundCountdown";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import { Link, useRouter } from "@/i18n/navigation";
import type { TutorialPack } from "@/content/schemas/tutorial";
import type { LevelId } from "@/features/levels/levelModel";
import { useProgress } from "@/features/progress/ProgressProvider";
import { createAttemptMetadata } from "@/features/progress/attemptMetadata";
import type { LevelAttempt } from "@/features/progress/progressState";
import { getResultsAttemptPath } from "@/features/results/resultNavigation";
import { calculateLevelScore } from "@/features/scoring/levelScore";
import { createInitialTutorialState, tutorialReducer } from "@/features/game/tutorialState";
import { revealRoundFeedback } from "@/features/game/feedbackNavigation";
import {
  getChoicePresentation,
  getFeedbackBlocks,
  getLearningStepStates,
  type ChoiceVisualState
} from "@/features/game/tutorialPresentation";
import { ImageZoom } from "./ImageZoom";
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
  const tEducation = useTranslations("education");
  const { readAloud, reducedMotion } = useAccessibility();
  const router = useRouter();
  const { completeLevel } = useProgress();
  const [state, dispatch] = useReducer(tutorialReducer, createInitialTutorialState(showBriefing));
  const [briefingIndex, setBriefingIndex] = useState(0);
  const [responseTimer] = useState(() => new ActiveResponseTimer());
  const [roundClosure] = useState(() => new RoundClosureGuard());
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [timerAnnouncement, setTimerAnnouncement] = useState<TimerAnnouncement | null>(null);
  const [countdownStart, setCountdownStart] = useState<{ roundId: string; startedAt: number } | null>(null);
  const [narrationStopSignal, setNarrationStopSignal] = useState(0);
  const completionAttemptRef = useRef<LevelAttempt | null>(null);
  const hasRecordedCompletionRef = useRef(false);
  const warningRoundRef = useRef<string | null>(null);
  const roundDeadlineRef = useRef<RoundDeadline | null>(null);
  const narrationGateRef = useRef(new InitialNarrationCountdownGate());
  const feedbackRef = useRef<HTMLElement>(null);

  const briefingLines = showBriefing ? (tEducation.raw("briefing") as string[]) : (t.raw("briefing") as string[]);
  const isFinished = state.status === "completed";
  const correctRounds = state.status === "completed" ? state.correctRounds : 0;
  const totalRounds = pack.rounds.length;
  // Scored from the recorded rounds, so the number saved is the one that was played.
  const attemptScore = state.status === "completed" ? calculateLevelScore(state.roundOutcomes) : null;

  const isPlaying = state.status === "playing";
  const roundIndex = state.status === "playing" ? state.roundIndex : -1;
  const answerSubmitted = state.status === "playing" ? state.answerSubmitted : false;
  const activeRoundId = isPlaying ? pack.rounds[roundIndex].id : null;
  const timedDurationMs = typeof secondsPerRound === "number" && Number.isFinite(secondsPerRound) && secondsPerRound > 0
    ? Math.trunc(secondsPerRound * 1_000)
    : null;
  const isRoundTimed = timedDurationMs !== null && isPlaying && !answerSubmitted;

  useEffect(() => {
    if (!answerSubmitted || !feedbackRef.current) return;
    revealRoundFeedback(feedbackRef.current, reducedMotion);
  }, [activeRoundId, answerSubmitted, reducedMotion]);

  const startTimedCountdown = useCallback((roundId: string) => {
    if (!narrationGateRef.current.start(roundId)) return;
    setCountdownStart({ roundId, startedAt: monotonicNow() });
  }, []);

  // A timed round waits only for its first automatic narration. No narration setting (or
  // unavailable speech) opens immediately; every new round receives a fresh gate.
  useEffect(() => {
    if (!isPlaying || answerSubmitted || !activeRoundId || timedDurationMs === null) return;
    if (narrationGateRef.current.prepare(activeRoundId, readAloud)) {
      setCountdownStart((current) =>
        current?.roundId === activeRoundId ? current : { roundId: activeRoundId, startedAt: monotonicNow() }
      );
      return;
    }
    setCountdownStart(null);
  }, [activeRoundId, answerSubmitted, isPlaying, readAloud, timedDurationMs]);

  // A round starts counting only once its answer controls are interactive. Timed
  // rounds use this same moment to create their fixed deadline.
  useEffect(() => {
    if (!isPlaying || answerSubmitted || !activeRoundId) return;
    if (timedDurationMs !== null && countdownStart?.roundId !== activeRoundId) return;
    const startedAt = countdownStart?.roundId === activeRoundId ? countdownStart.startedAt : monotonicNow();
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
        /*
         * Once, on the crossing, guarded by the same ref that keeps the spoken warning
         * from repeating. A tick every second would be a clock counting a child down, and
         * a calmer game drops this sound entirely rather than turning it down.
         */
        playSound("timeWarning");
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
  }, [activeRoundId, answerSubmitted, countdownStart, isPlaying, responseTimer, roundClosure, timedDurationMs]);

  // Persist the attempt before navigating so the destination can require this exact id.
  useEffect(() => {
    if (!isFinished || hasRecordedCompletionRef.current) return;
    hasRecordedCompletionRef.current = true;
    const metadata = createAttemptMetadata();
    const attempt = completionAttemptRef.current ?? {
      correctRounds,
      totalRounds,
      elapsedMs: responseTimer.getElapsedMs(),
      ...(attemptScore === null ? {} : { score: attemptScore }),
      ...metadata
    };
    completionAttemptRef.current = attempt;
    completeLevel(levelId, {
      ...attempt
    });
    router.replace(getResultsAttemptPath(attempt.attemptId));
  }, [attemptScore, completeLevel, correctRounds, isFinished, levelId, responseTimer, router, totalRounds]);

  useEffect(() => {
    preloadFeedbackRoqui();
  }, []);

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
        {/* Renders nothing, so it can live inside the tap target the whole screen is. */}
        <Narrator lines={[briefingLines[briefingIndex]]} />
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
  const timerLabel = announcementForRound === "expired"
    ? t("timeExpired")
    : getDisplayedRemainingSeconds(countdownForRound?.remainingMs ?? timedDurationMs ?? 0) === 1
      ? t("timeRemainingOne")
      : t("timeRemaining", { seconds: getDisplayedRemainingSeconds(countdownForRound?.remainingMs ?? timedDurationMs ?? 0) });

  return (
    // "tutorial-round" is only a hook for the existing global rule that hides the
    // app header during a round; all styling lives in the module.
    <section aria-labelledby="tutorial-question" className={`${styles.round} tutorial-round`}>
      <header className={styles.header}>
        <Link className={styles.headerLink} href="/worlds">
          <ChevronLeft aria-hidden="true" size={20} />
          <span>{t("exit")}</span>
        </Link>
        {/*
          Nothing but the way out and where you are.

          The options link used to sit here and it was the only round screen that had one -
          the single-image and timed rounds never did. Leaving a mission to change a
          setting means abandoning the round, so the door was offering to undo the very
          thing the child had just started.
        */}
        <p className={styles.headerProgress}>{t("progress", { current: round.order, total: pack.rounds.length })}</p>
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
            {timerLabel}
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
          {/*
           * Reading aloud is the one support with measured benefit for both of the
           * difficulties this game is most likely to meet, so it sits with the question
           * rather than buried in a menu. It renders nothing unless the child asked for it
           * and this phone can actually speak their language.
           *
           * It reads the two options as well as the question: a child who cannot read the
           * choices cannot answer, however clearly the question was put.
           */}
          {/*
           * The question only. The alt text of each image describes what is in it, and
           * describing the pictures to a child whose whole task is to look at them would
           * be answering the question for them.
           */}
          <Narrator
            key={round.id}
            lines={[t(round.promptKey)]}
            stopSignal={narrationStopSignal}
            onNarrationEnd={() => startTimedCountdown(round.id)}
            onNarrationUnavailable={() => startTimedCountdown(round.id)}
          />

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
                state.answerSubmitted && selectedIsCorrect && isAiChoice ? styles.cardSuccess : "",
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
                /*
                  The magnifier is a sibling of the card, not a child of it: the card is a
                  button, one button cannot live inside another, and looking closer must
                  never be mistaken for choosing.
                */
                <div className={styles.cardWrap} key={choice.id}>
                <ImageZoom
                  alt={description}
                  closeSignal={announcementForRound === "expired" ? round.order : 0}
                  src={choice.media.src}
                  timer={
                    countdownForRound && isRoundTimed
                      ? { label: timerLabel, warning: announcementForRound === "warning" }
                      : undefined
                  }
                />
                <button
                  aria-label={[t("choiceAria", { position, description }), cardStatus].filter(Boolean).join(". ")}
                  aria-pressed={selected}
                  className={className}
                  disabled={state.answerSubmitted}
                  type="button"
                  onClick={() => {
                    if (isRoundTimed && !narrationGateRef.current.hasStarted(round.id)) {
                      startTimedCountdown(round.id);
                      setNarrationStopSignal((signal) => signal + 1);
                    }
                    dispatch({ type: "select", choiceId: choice.id });
                  }}
                >
                  <span className={styles.cardPosition}>{position}</span>
                  <span
                    className={`${styles.cardMedia} ${
                      choice.media.src.startsWith("/media/tutorial/basics/basics-1/") ? styles.cardMediaContained : ""
                    }`}
                  >
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
                </div>
              );
            })}
          </div>

          {!state.answerSubmitted && (
            <div className={styles.actions}>
              <p>{state.selectedChoiceId === null ? t("selectPrompt") : t("selectedHint")}</p>
              <button
                className={styles.primaryButton}
                disabled={state.selectedChoiceId === null}
                type="button"
                onClick={() => {
                  if (!roundClosure.tryClose(round.id)) return;
                  const answeredAt = monotonicNow();
                  responseTimer.finishRound(round.id, answeredAt);
                  // Only a timed round has a clock to report; an untimed one stays silent
                  // so the score treats it as accuracy alone rather than as a slow answer.
                  const deadline =
                    roundDeadlineRef.current?.roundId === round.id ? roundDeadlineRef.current : null;
                  dispatch({
                    type: "submit",
                    correct: selectedIsCorrect,
                    ...(deadline
                      ? { remainingMs: getRemainingMs(deadline, answeredAt), durationMs: deadline.durationMs }
                      : {})
                  });
                  /*
                   * A right answer rises, a wrong one does not fall: getting it wrong is
                   * how anybody learns to look, so the miss is a plain note rather than a
                   * verdict. Both are silent unless somebody switched sound on.
                   */
                  playSound(selectedIsCorrect ? "correct" : "wrong");
                }}
              >
                {t("submit")}
              </button>
            </div>
          )}
        </div>

        {state.answerSubmitted && (
          <div className={styles.panelDock}>
            <section
              aria-labelledby="feedback-title"
              aria-live="polite"
              className={`${styles.panel} ${selectedIsCorrect ? styles.panelCorrect : styles.panelRetry}`}
              ref={feedbackRef}
              tabIndex={-1}
            >
              <header className={styles.panelHeader}>
                <Image
                  alt=""
                  className={styles.feedbackRoqui}
                  height={64}
                  src={selectedIsCorrect ? "/media/ui/roqui-feedback/roqui-success.png" : "/media/ui/roqui-feedback/roqui-oops.png"}
                  width={64}
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
                  <span className={styles.clueText}>
                    {t(block.textKey)}
                  </span>
                  </p>
                ))}
                {/*
                 * The explanation is the part that teaches; leaving it unread would mean
                 * the child can play the game without ever reaching the lesson in it.
                 */}
                <Narrator
                  lines={[
                    selectedIsCorrect ? t("correct") : t("tryAgain"),
                    ...feedbackBlocks.map((block) => `${t(block.labelKey)}: ${t(block.textKey)}`)
                  ]}
                />
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
