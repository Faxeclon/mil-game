"use client";

import Image from "next/image";
import { useReducer } from "react";
import { Accessibility, Check, ChevronLeft, Lightbulb, LockKeyhole, Sparkles, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { LookAskCheck } from "@/components/LookAskCheck";
import { Link } from "@/i18n/navigation";
import type { TutorialPack } from "@/content/schemas/tutorial";
import { initialTutorialState, tutorialReducer } from "@/features/game/tutorialState";
import {
  getChoicePresentation,
  getFeedbackBlocks,
  getLearningStepStates,
  type ChoiceVisualState
} from "@/features/game/tutorialPresentation";
import styles from "./TutorialClient.module.css";

type TutorialClientProps = { pack: TutorialPack };

const cardStateClass: Record<ChoiceVisualState, string> = {
  idle: "",
  selected: styles.cardSelected,
  ai: styles.cardAi,
  mistake: styles.cardMistake,
  neutral: styles.cardNeutral
};

export function TutorialClient({ pack }: TutorialClientProps) {
  const t = useTranslations("tutorial");
  const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);

  if (state.status === "intro") {
    return (
      <section aria-labelledby="tutorial-title" className={styles.briefing}>
        <p className={styles.briefingChip}>
          <Target aria-hidden="true" size={14} />
          {t("missionChip")}
        </p>
        <h1 className={styles.briefingTitle} id="tutorial-title">
          {t("introTitle")}
        </h1>
        <p className={styles.briefingLead}>{t("introLead")}</p>
        <p className={styles.briefingHint}>{t("introHint")}</p>
        <p className={styles.briefingMeta}>{t("introMeta")}</p>
        <button className={styles.primaryButton} type="button" onClick={() => dispatch({ type: "start" })}>
          {t("start")}
        </button>
      </section>
    );
  }

  if (state.status === "completed") {
    return (
      <section aria-labelledby="completion-title" className={styles.completion}>
        <span aria-hidden="true" className={styles.completionBadge}>
          <Check size={36} strokeWidth={3} />
          <span className={`${styles.spark} ${styles.sparkOne}`} />
          <span className={`${styles.spark} ${styles.sparkTwo}`} />
          <span className={`${styles.spark} ${styles.sparkThree}`} />
        </span>
        <h1 className={styles.completionTitle} id="completion-title">
          {t("completionTitle")}
        </h1>
        <p className={styles.completionText}>{t("completionDescription")}</p>
        <LookAskCheck sequential states={{ look: "completed", ask: "completed", check: "completed" }} />
        <p className={styles.nextMission}>
          <span>{t("nextMissionTitle")}</span>
          <span className={styles.nextMissionStatus}>
            <LockKeyhole aria-hidden="true" size={13} />
            {t("nextMissionStatus")}
          </span>
        </p>
        <div className={styles.completionActions}>
          <Link className={styles.primaryLink} href="/worlds">
            {t("returnToMissions")}
          </Link>
          <button className={styles.secondaryButton} type="button" onClick={() => dispatch({ type: "restart" })}>
            {t("replay")}
          </button>
        </div>
      </section>
    );
  }

  const round = pack.rounds[state.roundIndex];
  const selectedChoice = round.choices.find((choice) => choice.id === state.selectedChoiceId);
  const selectedIsCorrect = selectedChoice?.id === round.correctChoiceId;
  const isFinalRound = round.order === pack.rounds.length;
  const feedbackBlocks = getFeedbackBlocks(round);

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

      <div className={`${styles.gameplay} ${state.answerSubmitted ? styles.gameplayFeedback : ""}`}>
        {/* Keying on the round id replays the entrance transition once per round. */}
        <div className={styles.board} key={round.id}>
          <p className={styles.missionChip}>{t("missionChip")}</p>
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
                onClick={() => dispatch({ type: "submit" })}
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
              <span
                aria-hidden="true"
                className={`${styles.reaction} ${selectedIsCorrect ? styles.reactionCorrect : styles.reactionRetry}`}
              >
                {selectedIsCorrect ? <Check size={17} strokeWidth={3} /> : <Lightbulb size={16} />}
              </span>
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
