"use client";

import { useEffect, useReducer, useState } from "react";
import { Check, ChevronLeft, Smartphone, Sparkles, Target, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { playSound } from "@/features/audio/soundEffects";
import { Narrator } from "@/components/Narrator";
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
import { ImageZoom } from "./ImageZoom";
import { RoundMedia } from "./RoundMedia";
import styles from "./VersusClient.module.css";

/** Short matches on purpose: a shared phone changes hands, and patience is finite. */
const TURN_CHOICES = [3, 5] as const;

/** How long the turn card stays up before the round appears. */
const HANDOVER_MS = 1_400;

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
  const [turnsPerPlayer, setTurnsPerPlayer] = useState<number>(TURN_CHOICES[0]);
  const [deck, setDeck] = useState<TutorialRound[]>([]);
  const totalRounds = deck.length;

  /*
   * The phone changing hands, sounded once per handover.
   *
   * Keyed on the turn rather than on the status, so a redraw of the same handover screen
   * stays quiet and only an actual change of player rings. The two children are sitting
   * together looking at one screen, and this is what makes the other one look up.
   */
  const handoverKey = state.status === "handover" ? `${state.roundIndex}:${state.player}` : null;
  useEffect(() => {
    if (handoverKey) playSound("turnHandover");
  }, [handoverKey]);

  /*
   * The turn card clears itself.
   *
   * Long enough to read four words and look up, short enough that it never feels like a
   * screen to get through. A tap still skips it, so a throttled timer in a backgrounded
   * tab cannot strand anybody.
   */
  useEffect(() => {
    if (!handoverKey) return;
    const timer = window.setTimeout(() => dispatch({ type: "ready" }), HANDOVER_MS);
    return () => clearTimeout(timer);
  }, [handoverKey]);

  /*
   * Two seats, not two profiles.
   *
   * The seats used to borrow the nicknames of whoever had a profile on this phone, on the
   * assumption that the children who share the device are the ones about to share the
   * match. That assumption is wrong often enough to be a bug: it announced "Sebas vs hola"
   * when the second profile was a test, and it names an absent sibling when a friend is
   * the one actually holding the phone.
   *
   * Nobody is asked to type a name either. A match lasts a few minutes and nothing about
   * it is saved, so "Player 1" and "Player 2" say everything the two of them need to know
   * about whose turn it is.
   */
  const playerName = (player: VersusPlayer) => t(player === 1 ? "playerOne" : "playerTwo");

  const beginMatch = (turns: number) => {
    setTurnsPerPlayer(turns);
    setDeck(buildVersusDeck(rounds, turns));
    dispatch({ type: "restart" });
    dispatch({ type: "start" });
  };

  if (state.status === "lobby") {
    return (
      <section aria-labelledby="versus-title" className={styles.versus}>
        <MascotSlot alt={t("mascotAlt")} className={styles.mascot} mood="welcoming" priority />
        <h1 className={styles.title} id="versus-title">
          {t("title")}
        </h1>
        <p className={styles.lead}>{t("lead")}</p>

        <p className={styles.lineup}>
          <span className={styles.lineupName}>{playerName(1)}</span>
          <span aria-hidden="true" className={styles.lineupVs}>
            vs
          </span>
          <span className={styles.lineupName}>{playerName(2)}</span>
        </p>

        {/*
          One rule, and it is the only one this screen needs: the phone changes hands.

          "Who published this, and is the original source available?" used to sit here as a
          second line. It is a good question and it belongs in the feedback after a round -
          but in a lobby, in front of two children about to pass a phone back and forth, it
          is a paragraph of advice standing between them and the game.
        */}
        <ol className={styles.rules}>
          <li className={styles.rule}>
            <Smartphone aria-hidden="true" size={16} />
            {t("rulePass")}
          </li>
        </ol>

        <fieldset className={styles.turnPicker}>
          <legend className={styles.turnLegend}>{t("chooseTurns")}</legend>
          <span className={styles.turnOptions}>
            {TURN_CHOICES.map((turns) => (
              <button
                aria-pressed={turns === turnsPerPlayer}
                className={`${styles.turnOption} ${turns === turnsPerPlayer ? styles.turnOptionOn : ""}`}
                key={turns}
                type="button"
                onClick={() => setTurnsPerPlayer(turns)}
              >
                {t("ruleTurns", { turns })}
              </button>
            ))}
          </span>
        </fieldset>

        <button className={styles.primary} type="button" onClick={() => beginMatch(turnsPerPlayer)}>
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

        <button className={styles.primary} type="button" onClick={() => beginMatch(turnsPerPlayer)}>
          {t("rematch")}
        </button>
        <Link className={styles.secondary} href="/worlds">
          {t("exit")}
        </Link>
      </section>
    );
  }

  /*
   * The name and the number are separated on purpose.
   *
   * They used to sit side by side at the same size and weight, so "Player 1 0" read as one
   * label and nobody could see that the 0 was a score climbing. Small quiet name, large
   * figure underneath: the thing that changes is the thing that is big.
   */
  const scoreSide = (player: VersusPlayer) => (
    <span
      className={`${styles.scoreSide} ${state.player === player ? styles.scoreActive : styles.scoreIdle}`}
    >
      <span className={styles.scoreName}>{playerName(player)}</span>
      <span className={styles.scoreValue}>{state.scores[player - 1]}</span>
    </span>
  );

  const scoreboard = (
    <p className={styles.scoreboard}>
      {scoreSide(1)}
      <span className={styles.scoreRound}>{t("turn", { current: state.roundIndex + 1, total: totalRounds })}</span>
      {scoreSide(2)}
    </p>
  );

  if (state.status === "handover") {
    return (
      /*
       * A card that announces the turn and then gets out of the way.
       *
       * It used to ask "ready, Player 2?" under a heading that already said it was Player
       * 2's turn - the same fact twice, with a button between the two of them and the game.
       * Now it says whose turn it is and moves on by itself.
       *
       * Still tappable, and that is not decoration: if a timer is throttled by a
       * backgrounded tab, a tap is the way out rather than a stuck screen.
       */
      <button
        aria-label={t("handTo", { player: playerName(state.player) })}
        className={`${styles.handover} app-chrome-hidden`}
        type="button"
        onClick={() => dispatch({ type: "ready" })}
      >
        <span className={styles.handoverStage}>
          <MascotSlot alt={t("mascotAlt")} className={styles.handoverMascot} mood="encouraging" priority />
          <span aria-live="polite" className={styles.handoverTitle}>
            {t("handTo", { player: playerName(state.player) })}
          </span>
          <span className={styles.handoverScore}>
            {state.scores[0]} – {state.scores[1]}
          </span>
        </span>
      </button>
    );
  }

  const round = deck[state.roundIndex];
  const isLastTurn = state.roundIndex === totalRounds - 1;

  return (
    <section aria-labelledby="versus-question" className={styles.versus}>
      {/*
        The way out sits above the scoreboard, where a back link belongs, rather than at
        the foot of the page under the answer button. It goes home rather than to the
        islands: a match is not part of the map, so returning to the map was dropping
        somebody into a place they had not come from.
      */}
      <Link className={styles.quit} href="/">
        <ChevronLeft aria-hidden="true" size={16} />
        {t("exitHome")}
      </Link>

      {scoreboard}

      <p className={styles.turnChip}>
        <Target aria-hidden="true" size={13} />
        {t("yourTurn", { player: playerName(state.player) })}
      </p>

      <h1 className={styles.question} id="versus-question">
        {tTutorial(round.promptKey)}
      </h1>

      {/*
       * Passing the phone back and forth is no reason to make one of the two players read
       * silently. Whose turn it is gets read too, since that is the part being handed over.
       */}
      {/* Whose turn it is and what is being asked. Never what is in the pictures: that is
          the part the player is here to work out. */}
      <Narrator
        lines={[t("yourTurn", { player: playerName(state.player) }), tTutorial(round.promptKey)]}
      />

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
            /*
              The magnifier is a sibling of the card, not a child of it: the card is a
              button, one button cannot live inside another, and looking closer must never
              be mistaken for choosing.
            */
            <div className={styles.cardWrap} key={choice.id}>
            <ImageZoom
              alt={tTutorial(choice.media.altKey)}
              kind={choice.media.kind}
              src={choice.media.src}
            />
            <button
              aria-label={tTutorial("choiceAria", {
                position: tTutorial(choice.position),
                description: tTutorial(choice.media.altKey)
              })}
              aria-pressed={selected}
              className={className}
              disabled={revealed}
              type="button"
              onClick={() => dispatch({ type: "select", choiceId: choice.id })}
            >
              <span className={styles.cardMedia}>
                <RoundMedia
                  alt={tTutorial(choice.media.altKey)}
                  kind={choice.media.kind}
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
            </div>
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

    </section>
  );
}
