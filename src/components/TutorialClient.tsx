"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef } from "react";
import { Accessibility, CheckCircle2, ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { LookAskCheck, type LearningStep, type LearningStepState } from "@/components/LookAskCheck";
import { Link } from "@/i18n/navigation";
import type { TutorialLearningGoal, TutorialPack } from "@/content/schemas/tutorial";
import { initialTutorialState, tutorialReducer } from "@/features/game/tutorialState";

type TutorialClientProps = { pack: TutorialPack };

function feedbackStates(goal: TutorialLearningGoal): Record<LearningStep, LearningStepState> {
  const highlighted: Record<TutorialLearningGoal, LearningStep[]> = {
    "visible-clue": ["look"],
    "source-and-purpose": ["look", "ask"],
    uncertainty: ["look", "ask", "check"]
  };
  return {
    look: highlighted[goal].includes("look") ? "highlighted" : "inactive",
    ask: highlighted[goal].includes("ask") ? "highlighted" : "inactive",
    check: highlighted[goal].includes("check") ? "highlighted" : "inactive"
  };
}

export function TutorialClient({ pack }: TutorialClientProps) {
  const t = useTranslations("tutorial");
  const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.status === "playing" && state.answerSubmitted) nextButtonRef.current?.focus();
  }, [state]);

  if (state.status === "intro") {
    return (
      <section className="tutorial-intro" aria-labelledby="tutorial-title">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="tutorial-title">{t("introTitle")}</h1>
        <p>{t("introDescription")}</p>
        <button className="tutorial-primary-button" type="button" onClick={() => dispatch({ type: "start" })}>{t("start")}</button>
      </section>
    );
  }

  if (state.status === "completed") {
    return (
      <section className="tutorial-completion" aria-labelledby="completion-title">
        <CheckCircle2 aria-hidden="true" size={48} />
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="completion-title">{t("completionTitle")}</h1>
        <p>{t("completionDescription")}</p>
        <LookAskCheck states={{ look: "highlighted", ask: "highlighted", check: "highlighted" }} />
        <div className="tutorial-completion__actions">
          <Link className="tutorial-secondary-link" href="/worlds">{t("returnToMissions")}</Link>
          <button className="tutorial-primary-button" type="button" onClick={() => dispatch({ type: "restart" })}>{t("replay")}</button>
        </div>
      </section>
    );
  }

  const round = pack.rounds[state.roundIndex];
  const selectedChoice = round.choices.find((choice) => choice.id === state.selectedChoiceId);
  const selectedIsCorrect = selectedChoice?.id === round.correctChoiceId;

  return (
    <section className="tutorial-round" aria-labelledby="tutorial-question">
      <header className="tutorial-game-header">
        <Link href="/worlds"><ChevronLeft aria-hidden="true" size={21} /><span>{t("exit")}</span></Link>
        <p>{t("progress", { current: round.order, total: pack.rounds.length })}</p>
        <Link href="/settings"><Accessibility aria-hidden="true" size={19} /><span>{t("settings")}</span></Link>
      </header>
      <div className="tutorial-progress" aria-hidden="true"><div className="tutorial-progress__track"><span style={{ width: `${(round.order / pack.rounds.length) * 100}%` }} /></div></div>
      <h1 id="tutorial-question">{t(round.promptKey)}</h1>

      <div className="choice-grid" role="group" aria-labelledby="tutorial-question">
        {round.choices.map((choice) => {
          const selected = choice.id === state.selectedChoiceId;
          const correct = choice.id === round.correctChoiceId;
          const classNames = [
            "choice-card",
            selected && "choice-card--selected",
            state.answerSubmitted && correct && "choice-card--answer",
            state.answerSubmitted && selected && !correct && "choice-card--selected-incorrect"
          ].filter(Boolean).join(" ");
          const position = t(choice.position);
          const description = t(choice.media.altKey);
          return (
            <button
              aria-pressed={selected}
              aria-label={t("choiceAria", { position, description })}
              className={classNames}
              disabled={state.answerSubmitted}
              key={choice.id}
              type="button"
              onClick={() => dispatch({ type: "select", choiceId: choice.id })}
            >
              <span className="choice-card__position">{position}</span>
              <span className="choice-card__media"><Image alt={description} fill sizes="(max-width: 700px) 45vw, 360px" src={choice.media.src} /></span>
              {selected && <span className="choice-card__status">{state.answerSubmitted ? t("locked") : t("selected")}</span>}
              {state.answerSubmitted && correct && <span className="choice-card__answer-label">{t("answer")}</span>}
            </button>
          );
        })}
      </div>

      {!state.answerSubmitted && (
        <div className="tutorial-actions">
          <p>{state.selectedChoiceId === null ? t("selectPrompt") : t("selected")}</p>
          <button className="tutorial-primary-button" disabled={state.selectedChoiceId === null} type="button" onClick={() => dispatch({ type: "submit" })}>{t("submit")}</button>
        </div>
      )}

      {state.answerSubmitted && (
        <section className="tutorial-feedback-panel" aria-live="polite" aria-labelledby="feedback-title">
          <div className="tutorial-feedback-panel__content">
            <p className={`feedback-message ${selectedIsCorrect ? "feedback-message--correct" : "feedback-message--retry"}`} id="feedback-title">{selectedIsCorrect ? t("correct") : t("tryAgain")}</p>
            <LookAskCheck states={feedbackStates(round.learningGoal)} />
            <div className="tutorial-feedback__content">
              <p>{t(round.feedback.observationKey)}</p>
              {round.feedback.questionKey && <p>{t(round.feedback.questionKey)}</p>}
              {round.feedback.verificationKey && <p>{t(round.feedback.verificationKey)}</p>}
              {round.feedback.uncertaintyKey && <p className="tutorial-feedback__uncertainty">{t(round.feedback.uncertaintyKey)}</p>}
              <p>{t(round.feedback.explanationKey)}</p>
            </div>
            <button className="tutorial-primary-button" ref={nextButtonRef} type="button" onClick={() => dispatch({ type: "next", totalRounds: pack.rounds.length })}>{round.order === pack.rounds.length ? t("finish") : t("next")}</button>
          </div>
        </section>
      )}
    </section>
  );
}
