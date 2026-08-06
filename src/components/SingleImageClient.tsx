"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef, useState } from "react";
import { Camera, Check, ChevronLeft, Sparkles, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { LookAskCheck } from "@/components/LookAskCheck";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import type { SinglePack } from "@/content/schemas/tutorial";
import { ActiveResponseTimer } from "@/features/game/activeResponseTimer";
import { createInitialTutorialState, tutorialReducer } from "@/features/game/tutorialState";
import { getFeedbackBlocks, getLearningStepStates } from "@/features/game/tutorialPresentation";
import type { LevelId } from "@/features/levels/levelModel";
import { createAttemptMetadata } from "@/features/progress/attemptMetadata";
import type { LevelAttempt } from "@/features/progress/progressState";
import { useProgress } from "@/features/progress/ProgressProvider";
import { getResultsAttemptPath } from "@/features/results/resultNavigation";
import { calculateLevelScore } from "@/features/scoring/levelScore";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./SingleImageClient.module.css";

type SingleImageClientProps = {
  pack: SinglePack;
  levelId: LevelId;
  chipLabel: string;
  entryTitle: string;
  entryMeta: string;
};

function monotonicNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

/**
 * One image at a time.
 *
 * Comparing two pictures gives a child a free clue: whatever differs between them is
 * where to look. Here that help is gone, so the only tool left is their own criteria —
 * which is the whole point, and why this mode is the real step up in difficulty.
 *
 * It reuses the same round reducer and the same scoring as the comparison missions, so a
 * result recorded here is worth exactly what a result recorded there is worth.
 */
export function SingleImageClient({ pack, levelId, chipLabel, entryTitle, entryMeta }: SingleImageClientProps) {
  const t = useTranslations("tutorial");
  const router = useRouter();
  const { completeLevel } = useProgress();
  const [state, dispatch] = useReducer(tutorialReducer, createInitialTutorialState(false));
  const [responseTimer] = useState(() => new ActiveResponseTimer());
  const completionAttemptRef = useRef<LevelAttempt | null>(null);
  const hasRecordedCompletionRef = useRef(false);

  const totalRounds = pack.rounds.length;
  const isFinished = state.status === "completed";
  const correctRounds = state.status === "completed" ? state.correctRounds : 0;
  const attemptScore = state.status === "completed" ? calculateLevelScore(state.roundOutcomes) : null;
  const isPlaying = state.status === "playing";
  const activeRoundId = isPlaying ? pack.rounds[state.roundIndex].id : null;
  const answerSubmitted = isPlaying ? state.answerSubmitted : false;

  useEffect(() => {
    if (!activeRoundId || answerSubmitted) return;
    responseTimer.startRound(activeRoundId, monotonicNow());
  }, [activeRoundId, answerSubmitted, responseTimer]);

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
    completeLevel(levelId, { ...attempt });
    router.replace(getResultsAttemptPath(attempt.attemptId));
  }, [attemptScore, completeLevel, correctRounds, isFinished, levelId, responseTimer, router, totalRounds]);

  if (state.status === "intro") {
    return (
      <button className={`${styles.intro} app-chrome-hidden`} type="button" onClick={() => dispatch({ type: "start" })}>
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

  if (state.status === "completed") {
    return (
      <p className={styles.handover} role="status">
        {t("savingResult")}
      </p>
    );
  }

  const round = pack.rounds[state.roundIndex];
  const isCorrect = state.selectedChoiceId === round.answer;
  const isFinalRound = round.order === totalRounds;
  const feedbackBlocks = getFeedbackBlocks(round);

  const answers = [
    { id: "ai-generated", labelKey: "answerAi", Icon: Sparkles },
    { id: "camera-captured", labelKey: "answerCamera", Icon: Camera }
  ] as const;

  return (
    <section aria-labelledby="single-question" className={`${styles.round} tutorial-round`}>
      <header className={styles.header}>
        <Link className={styles.headerLink} href="/worlds">
          <ChevronLeft aria-hidden="true" size={20} />
          <span>{t("exit")}</span>
        </Link>
        <p className={styles.headerProgress}>{t("progress", { current: round.order, total: totalRounds })}</p>
      </header>

      <div aria-hidden="true" className={styles.progressTrack}>
        <span style={{ width: `${(round.order / totalRounds) * 100}%` }} />
      </div>

      <div className={styles.board} key={round.id}>
        <p className={styles.missionChip}>{chipLabel}</p>
        <h1 className={styles.question} id="single-question">
          {t(round.promptKey)}
        </h1>

        <figure className={styles.figure}>
          <Image
            alt={t(round.media.altKey)}
            fill
            priority
            sizes="(max-width: 700px) 88vw, 420px"
            src={round.media.src}
          />
        </figure>

        {state.answerSubmitted ? (
          <p className={isCorrect ? styles.verdictRight : styles.verdictWrong}>
            {isCorrect ? <Check aria-hidden="true" size={15} strokeWidth={3} /> : <Target aria-hidden="true" size={15} />}
            {isCorrect ? t("singleCorrect") : t("singleWrong")}
          </p>
        ) : (
          <p className={styles.hint}>{t("singleHint")}</p>
        )}

        <div aria-labelledby="single-question" className={styles.answers} role="group">
          {answers.map(({ id, labelKey, Icon }) => {
            const selected = state.selectedChoiceId === id;
            const isTruth = round.answer === id;
            const revealed = state.answerSubmitted;
            const className = [
              styles.answer,
              selected && !revealed ? styles.answerSelected : "",
              revealed && isTruth ? styles.answerTruth : "",
              revealed && selected && !isTruth ? styles.answerMistake : ""
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                aria-pressed={selected}
                className={className}
                disabled={revealed}
                key={id}
                type="button"
                onClick={() => dispatch({ type: "select", choiceId: id })}
              >
                <Icon aria-hidden="true" size={18} />
                {t(labelKey)}
                {revealed && isTruth && <Check aria-hidden="true" size={15} strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {state.answerSubmitted ? (
          <section aria-labelledby="single-feedback" aria-live="polite" className={styles.panel}>
            <p className={styles.panelTitle} id="single-feedback">
              {isCorrect ? t("correct") : t("tryAgain")}
            </p>
            <LookAskCheck compact states={getLearningStepStates(round.learningGoal)} />
            <div className={styles.panelBody}>
              {feedbackBlocks.map((block) => (
                <p className={styles.clue} key={block.labelKey}>
                  <span className={styles.clueLabel}>{t(block.labelKey)}</span>
                  <span className={styles.clueText}>{t(block.textKey)}</span>
                </p>
              ))}
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => dispatch({ type: "next", totalRounds })}
            >
              {isFinalRound ? t("finish") : t("next")}
            </button>
          </section>
        ) : (
          <button
            className={styles.primaryButton}
            disabled={state.selectedChoiceId === null}
            type="button"
            onClick={() => {
              responseTimer.finishRound(round.id, monotonicNow());
              dispatch({ type: "submit", correct: isCorrect });
            }}
          >
            {t("submit")}
          </button>
        )}
      </div>
    </section>
  );
}
