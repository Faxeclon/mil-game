"use client";

import Image from "next/image";
import { useReducer, useState } from "react";
import { Check, ChevronLeft, Smartphone, Sparkles, Target, Trophy, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { MascotSlot } from "@/features/mascot/MascotSlot";
import type { TutorialRound } from "@/content/schemas/tutorial";
import {
  buildVersusDeck,
  getVersusOutcome,
  initialVersusState,
  versusReducer,
  type VersusPlayer
} from "@/features/versus/versusState";
import { Link } from "@/i18n/navigation";
import styles from "./VersusClient.module.css";

const TURNS_PER_PLAYER = 3;

/**
 * Versus on a single phone, played in turns.
 *
 * There is no network here and nothing is saved: the match lives as long as the two of
 * them are sitting together. The handover screen exists so the player waiting cannot see
 * the round before it is theirs, which is the only rule a shared device really needs.
 */
export function VersusClient({ rounds }: { rounds: readonly TutorialRound[] }) {
  const t = useTranslations("versus");
  const tTutorial = useTranslations("tutorial");
  const [state, dispatch] = useReducer(versusReducer, initialVersusState);
  // Dealt once per mount, so a rematch reshuffles by remounting rather than mid-match.
  const [deck, setDeck] = useState(() => buildVersusDeck(rounds, TURNS_PER_PLAYER));
  const totalRounds = deck.length;

  const playerName = (player: VersusPlayer) => t(player === 1 ? "playerOne" : "playerTwo");

  if (state.status === "lobby") {
    return (
      <section aria-labelledby="versus-title" className={styles.versus}>
        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="welcoming" priority />
        <h1 className={styles.title} id="versus-title">
          {t("title")}
        </h1>
        <p className={styles.lead}>{t("lead")}</p>

        <ol className={styles.rules}>
          <li className={styles.rule}>
            <Users aria-hidden="true" size={16} />
            {t("ruleTurns", { turns: TURNS_PER_PLAYER })}
          </li>
          <li className={styles.rule}>
            <Smartphone aria-hidden="true" size={16} />
            {t("rulePass")}
          </li>
          <li className={styles.rule}>
            <Sparkles aria-hidden="true" size={16} />
            {t("ruleTalk")}
          </li>
        </ol>

        <button className={styles.primary} type="button" onClick={() => dispatch({ type: "start" })}>
          {t("start")}
        </button>
        <Link className={styles.secondary} href="/worlds">
          {t("exit")}
        </Link>
        <p className={styles.privacy}>{t("privacy")}</p>
      </section>
    );
  }

  if (state.status === "finished") {
    const outcome = getVersusOutcome(state.scores);

    return (
      <section aria-labelledby="versus-title" className={styles.versus}>
        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="celebrating" priority />
        <h1 className={styles.title} id="versus-title">
          {outcome.kind === "draw" ? t("draw") : t("winner", { player: playerName(outcome.player) })}
        </h1>

        <p className={styles.finalScore}>
          <span className={styles.finalSide}>
            <span className={styles.finalName}>{playerName(1)}</span>
            <span className={styles.finalValue}>{state.scores[0]}</span>
          </span>
          <span aria-hidden="true" className={styles.finalDash}>
            –
          </span>
          <span className={styles.finalSide}>
            <span className={styles.finalName}>{playerName(2)}</span>
            <span className={styles.finalValue}>{state.scores[1]}</span>
          </span>
        </p>

        <p className={styles.lead}>{t("closing")}</p>

        <button
          className={styles.primary}
          type="button"
          onClick={() => {
            setDeck(buildVersusDeck(rounds, TURNS_PER_PLAYER));
            dispatch({ type: "restart" });
          }}
        >
          {t("rematch")}
        </button>
        <Link className={styles.secondary} href="/worlds">
          {t("exit")}
        </Link>
      </section>
    );
  }

  const scoreboard = (
    <p className={styles.scoreboard}>
      <span className={state.player === 1 ? styles.scoreActive : styles.scoreIdle}>
        {playerName(1)} {state.scores[0]}
      </span>
      <span className={styles.scoreRound}>{t("turn", { current: state.roundIndex + 1, total: totalRounds })}</span>
      <span className={state.player === 2 ? styles.scoreActive : styles.scoreIdle}>
        {playerName(2)} {state.scores[1]}
      </span>
    </p>
  );

  if (state.status === "handover") {
    return (
      <section aria-labelledby="versus-title" className={styles.versus}>
        {scoreboard}
        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="encouraging" priority />
        <h1 className={styles.title} id="versus-title">
          {t("handTo", { player: playerName(state.player) })}
        </h1>
        <p className={styles.lead}>{t("handoverHint")}</p>
        <button className={styles.primary} type="button" onClick={() => dispatch({ type: "ready" })}>
          {t("ready", { player: playerName(state.player) })}
        </button>
      </section>
    );
  }

  const round = deck[state.roundIndex];
  const isLastTurn = state.roundIndex === totalRounds - 1;

  return (
    <section aria-labelledby="versus-question" className={styles.versus}>
      {scoreboard}

      <p className={styles.turnChip}>
        <Target aria-hidden="true" size={13} />
        {t("yourTurn", { player: playerName(state.player) })}
      </p>

      <h1 className={styles.question} id="versus-question">
        {tTutorial(round.promptKey)}
      </h1>

      <div aria-labelledby="versus-question" className={styles.choices} role="group">
        {round.choices.map((choice) => {
          const selected = choice.id === state.selectedChoiceId;
          const isAnswer = choice.id === round.correctChoiceId;
          const revealed = state.answerSubmitted;
          const className = [
            styles.card,
            selected && !revealed ? styles.cardSelected : "",
            revealed && isAnswer ? styles.cardAnswer : "",
            revealed && selected && !isAnswer ? styles.cardMistake : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              aria-label={tTutorial("choiceAria", {
                position: tTutorial(choice.position),
                description: tTutorial(choice.media.altKey)
              })}
              aria-pressed={selected}
              className={className}
              disabled={revealed}
              key={choice.id}
              type="button"
              onClick={() => dispatch({ type: "select", choiceId: choice.id })}
            >
              <span className={styles.cardMedia}>
                <Image
                  alt={tTutorial(choice.media.altKey)}
                  fill
                  sizes="(max-width: 700px) 45vw, 320px"
                  src={choice.media.src}
                />
              </span>
              {revealed && isAnswer && (
                <span className={styles.cardTag}>
                  <Sparkles aria-hidden="true" size={13} />
                  {tTutorial("aiChoice")}
                </span>
              )}
              {selected && !revealed && (
                <span aria-hidden="true" className={styles.cardMark}>
                  <Check size={15} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {state.answerSubmitted ? (
        <div aria-live="polite" className={styles.verdict}>
          <p className={state.lastCorrect ? styles.verdictWin : styles.verdictMiss}>
            {state.lastCorrect ? (
              <Trophy aria-hidden="true" size={16} />
            ) : (
              <Target aria-hidden="true" size={16} />
            )}
            {state.lastCorrect
              ? t("pointFor", { player: playerName(state.player) })
              : t("noPoint", { player: playerName(state.player) })}
          </p>
          <button
            className={styles.primary}
            type="button"
            onClick={() => dispatch({ type: "next", totalRounds })}
          >
            {isLastTurn ? t("seeResult") : t("nextTurn")}
          </button>
        </div>
      ) : (
        <div className={styles.actions}>
          <p className={styles.hint}>
            {state.selectedChoiceId === null ? tTutorial("selectPrompt") : tTutorial("selectedHint")}
          </p>
          <button
            className={styles.primary}
            disabled={state.selectedChoiceId === null}
            type="button"
            onClick={() =>
              dispatch({ type: "submit", correct: state.selectedChoiceId === round.correctChoiceId })
            }
          >
            {tTutorial("submit")}
          </button>
        </div>
      )}

      <Link className={styles.quit} href="/worlds">
        <ChevronLeft aria-hidden="true" size={16} />
        {t("exit")}
      </Link>
    </section>
  );
}
