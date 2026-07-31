"use client";

import Image from "next/image";
import { useReducer } from "react";
import { Accessibility, CheckCircle2, ChevronLeft, CircleCheck, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { LookAskCheck, type LearningStep, type LearningStepState } from "@/components/LookAskCheck";
import { Link } from "@/i18n/navigation";
import type { TutorialLearningGoal, TutorialPack, TutorialRound } from "@/content/schemas/tutorial";
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

  if (state.status === "intro") {
    return (
      <section className="tutorial-intro tutorial-intro--game" aria-labelledby="tutorial-title">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="tutorial-title">{t("introTitle")}</h1>
        <p>{t("introDescription")}</p>
        <button className="tutorial-primary-button" type="button" onClick={() => dispatch({ type: "start" })}>{t("start")}</button>
      </section>
    );
  }

  if (state.status === "completed") {
    return (
      <section className="tutorial-completion tutorial-completion--game" aria-labelledby="completion-title">
        <div className="tutorial-completion__rays" aria-hidden="true"><span /><span /><span /></div>
        <CheckCircle2 aria-hidden="true" size={54} />
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="completion-title">{t("completionTitle")}</h1>
        <p>{t("completionDescription")}</p>
        <LookAskCheck states={{ look: "highlighted", ask: "highlighted", check: "highlighted" }} />
        <div className="tutorial-completion__actions">
          <Link className="tutorial-primary-link" href="/worlds">{t("returnToMissions")}</Link>
          <button className="tutorial-secondary-button" type="button" onClick={() => dispatch({ type: "restart" })}>{t("replay")}</button>
        </div>
      </section>
    );
  }

  const round = pack.rounds[state.roundIndex];
  const selectedChoice = round.choices.find((choice) => choice.id === state.selectedChoiceId);
  const selectedIsCorrect = selectedChoice?.id === round.correctChoiceId;
  const feedbackItems = createFeedbackItems(round, t);

  return (
    <section className={`tutorial-round ${state.answerSubmitted ? "tutorial-round--submitted" : ""}`} aria-labelledby="tutorial-question">
      <header className="tutorial-game-header">
        <Link href="/worlds"><ChevronLeft aria-hidden="true" size={21} /><span>{t("exit")}</span></Link>
        <p>{t("progress", { current: round.order, total: pack.rounds.length })}</p>
        <Link href="/settings"><Accessibility aria-hidden="true" size={19} /><span>{t("settings")}</span></Link>
      </header>
      <div className="tutorial-progress" aria-hidden="true"><div className="tutorial-progress__track"><span style={{ width: `${(round.order / pack.rounds.length) * 100}%` }} /></div></div>

      <div className={`tutorial-gameplay ${state.answerSubmitted ? "tutorial-gameplay--feedback" : ""}`}>
        <div className="tutorial-board">
          <p className="tutorial-mission-chip">{t("missionChip")}</p>
          <h1 id="tutorial-question">{t(round.promptKey)}</h1>
          <div className="choice-grid" role="group" aria-labelledby="tutorial-question">
            {round.choices.map((choice) => {
              const selected = choice.id === state.selectedChoiceId;
              const correct = choice.id === round.correctChoiceId;
              const classNames = [
                "choice-card",
                selected && "choice-card--selected",
                state.answerSubmitted && correct && "choice-card--answer",
                state.answerSubmitted && selected && !correct && "choice-card--selected-incorrect",
                state.answerSubmitted && !selected && !correct && "choice-card--neutral",
                state.answerSubmitted && "choice-card--locked"
              ].filter(Boolean).join(" ");
              const position = t(choice.position);
              const description = t(choice.media.altKey);
              const status = state.answerSubmitted
                ? [t("locked"), ...(correct ? [t("aiChoice")] : [])].join(". ")
                : selected ? t("selected") : "";
              return (
                <button
                  aria-pressed={selected}
                  aria-label={[t("choiceAria", { position, description }), status].filter(Boolean).join(". ")}
                  className={classNames}
                  disabled={state.answerSubmitted}
                  key={choice.id}
                  type="button"
                  onClick={() => dispatch({ type: "select", choiceId: choice.id })}
                >
                  <span className="choice-card__position">{position}</span>
                  <span className="choice-card__media"><Image alt={description} fill sizes="(max-width: 700px) 45vw, 400px" src={choice.media.src} /></span>
                  {selected && !state.answerSubmitted && <span className="choice-card__status"><CircleCheck aria-hidden="true" size={18} />{t("selected")}</span>}
                  {state.answerSubmitted && <span className="choice-card__locked"><LockKeyhole aria-hidden="true" size={15} />{t("locked")}</span>}
                  {state.answerSubmitted && correct && <span className="choice-card__answer-label">{t("aiChoice")}</span>}
                </button>
              );
            })}
          </div>

          {!state.answerSubmitted && (
            <div className="tutorial-actions">
              <p>{state.selectedChoiceId === null ? t("selectPrompt") : t("selectedHint")}</p>
              <button className="tutorial-primary-button" disabled={state.selectedChoiceId === null} type="button" onClick={() => dispatch({ type: "submit" })}>{t("submit")}</button>
            </div>
          )}
        </div>

        {state.answerSubmitted && (
          <section className="tutorial-feedback-panel" aria-live="polite" aria-labelledby="feedback-title">
            <div className="tutorial-feedback-panel__content">
              <p className={`feedback-message ${selectedIsCorrect ? "feedback-message--correct" : "feedback-message--retry"}`} id="feedback-title">{selectedIsCorrect ? t("correct") : t("tryAgain")}</p>
              <LookAskCheck states={feedbackStates(round.learningGoal)} />
              <div className="tutorial-feedback__content">
                {feedbackItems.map((item) => <section className={`feedback-clue feedback-clue--${item.tone}`} key={`${item.label}-${item.text}`}><h2>{item.label}</h2><p>{item.text}</p></section>)}
              </div>
              <button className="tutorial-primary-button" type="button" onClick={() => dispatch({ type: "next", totalRounds: pack.rounds.length })}>{round.order === pack.rounds.length ? t("finish") : t("next")}</button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function createFeedbackItems(round: TutorialRound, t: ReturnType<typeof useTranslations>) {
  return [
    { label: t("look"), text: t(round.feedback.observationKey), tone: "look" },
    ...(round.feedback.questionKey ? [{ label: t("ask"), text: t(round.feedback.questionKey), tone: "ask" }] : []),
    ...(round.feedback.verificationKey ? [{ label: t("check"), text: t(round.feedback.verificationKey), tone: "check" }] : []),
    ...(round.feedback.uncertaintyKey ? [{ label: t("remember"), text: t(round.feedback.uncertaintyKey), tone: "remember" }] : []),
    { label: t("takeaway"), text: t(round.feedback.explanationKey), tone: "takeaway" }
  ];
}
