"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronLeft, Copy, Inbox, Swords, UserMinus, UserPlus, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { getGuardian } from "@/features/friends/friendsDirectory";
import {
  CODE_LENGTH,
  countFriends,
  formatCode,
  getFriends,
  getPendingRequests,
  getSentRequests,
  isCompleteCode,
  normalizeCode,
  type AddResult,
  type Player
} from "@/features/friends/friendsModel";
import {
  acceptFrom,
  askByCode,
  cancelSentRequest,
  rejectFrom,
  removeByPlayerId,
  useFriends
} from "@/features/friends/friendsStore";
import { Link } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
import styles from "./FriendsClient.module.css";

/**
 * The people a child plays with, reached by code and answered by hand.
 *
 * The whole flow is one rule seen from both sides: a code lets you knock, and the person
 * whose code it is decides. So a request sent from here waits, and a request arriving here
 * sits in the inbox until this child says yes or no. Nobody lands on anybody's list without
 * having agreed to it.
 *
 * There is no search and no directory: a child cannot discover another child in this game,
 * only be introduced to one. Every player is an alias and every grown-up is a role.
 */
export function FriendsClient() {
  const t = useTranslations("friends");
  const tCards = useTranslations("cards");
  const tLocked = useTranslations("locked");
  const fieldId = useId();

  const { hydrated, document, players, incoming } = useFriends();
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<{ result: AddResult; alias?: string } | null>(null);
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);
  const copyTimer = useRef<number | null>(null);

  // The confirmation fades on its own; a message that stays becomes furniture.
  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
  }, []);

  const copy = async (code: string) => {
    let ok = false;
    try {
      await navigator.clipboard?.writeText(code);
      ok = true;
    } catch {
      // Blocked clipboards are ordinary on a school device; the code is on screen anyway.
    }
    setCopied(ok ? "done" : "failed");
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 2500);
  };

  if (!hydrated) return <LoadingRoqui message={tLocked("checking")} title={t("title")} />;

  const requests = getPendingRequests(document, incoming, players);
  const sent = getSentRequests(document, players);
  const friends = getFriends(document, players);

  const submit = () => {
    const outcome = askByCode(typed);
    setFeedback(outcome);
    if (outcome.result === "requested") setTyped("");
  };

  return (
    <div className={styles.friends}>
      <Link className={styles.back} href="/">
        <ChevronLeft aria-hidden="true" size={18} />
        {tCards("back")}
      </Link>

      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>
      <p className={styles.prototypeNotice} role="status">{t("prototypeNotice")}</p>

      {/* What needs an answer comes first: an inbox below the fold is an inbox unread. */}
      {requests.length > 0 && (
        <section aria-labelledby="requests" className={styles.requestBox}>
          <h2 className={styles.sectionTitle} id="requests">
            <Inbox aria-hidden="true" size={16} />
            {t("requestsTitle", { count: requests.length })}
          </h2>
          <p className={styles.requestsHint}>{t("requestsHint")}</p>

          <ul className={styles.list}>
            {requests.map((player) => (
              <li className={styles.row} key={player.id}>
                <Who player={player} />
                <span className={styles.actions}>
                  <button className={styles.accept} type="button" onClick={() => acceptFrom(player.id)}>
                    <Check aria-hidden="true" size={15} />
                    {t("accept")}
                  </button>
                  <button
                    aria-label={t("rejectNamed", { alias: player.alias })}
                    className={styles.reject}
                    type="button"
                    onClick={() => rejectFrom(player.id)}
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="my-code" className={styles.codeBox}>
        <h2 className={styles.sectionTitle} id="my-code">
          {t("yourCode")}
        </h2>
        <p className={styles.code}>{document.code ? formatCode(document.code) : "—"}</p>
        <p className={styles.codeHint}>{t("yourCodeHint")}</p>
        {document.code && (
          <button className={styles.copy} type="button" onClick={() => void copy(document.code ?? "")}>
            {copied === "done" ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
            {copied === "done" ? t("copied") : t("copyCode")}
          </button>
        )}

        {/* Said out loud as well as shown: the tap has to confirm itself somehow. */}
        <p aria-live="polite" className={copied === "failed" ? styles.bad : styles.srOnly}>
          {copied === "done" ? t("copied") : copied === "failed" ? t("copyFailed") : ""}
        </p>
      </section>

      <section aria-labelledby="add-friend" className={styles.addBox}>
        <h2 className={styles.sectionTitle} id="add-friend">
          {t("addTitle")}
        </h2>

        <label className={styles.fieldLabel} htmlFor={fieldId}>
          {t("codeLabel")}
        </label>
        <div className={styles.addRow}>
          <input
            autoCapitalize="characters"
            autoComplete="off"
            className={styles.input}
            id={fieldId}
            inputMode="text"
            maxLength={CODE_LENGTH}
            placeholder={t("codePlaceholder")}
            spellCheck={false}
            type="text"
            value={typed}
            onChange={(event) => {
              setTyped(normalizeCode(event.target.value));
              setFeedback(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
          <button className={styles.add} disabled={!isCompleteCode(typed)} type="button" onClick={submit}>
            <UserPlus aria-hidden="true" size={16} />
            {t("ask")}
          </button>
        </div>

        {/* Each outcome says its own thing; "that did not work" helps nobody. */}
        {feedback && (
          <p className={feedback.result === "requested" ? styles.good : styles.bad} role="status">
            {feedback.result === "requested"
              ? t("requestSent", { alias: feedback.alias ?? "" })
              : feedback.result === "already"
                ? t("already", { alias: feedback.alias ?? "" })
                : feedback.result === "waiting"
                  ? t("stillWaiting", { alias: feedback.alias ?? "" })
                  : t(`error.${feedback.result}`)}
          </p>
        )}
      </section>

      {sent.length > 0 && (
        <section aria-labelledby="sent" className={styles.sentBox}>
          <h2 className={styles.sectionTitle} id="sent">
            {t("sentTitle")}
          </h2>
          <ul className={styles.list}>
            {sent.map((player) => (
              <li className={styles.row} key={player.id}>
                <Who player={player} />
                <span className={styles.actions}>
                  <span className={styles.waiting}>{t("waiting")}</span>
                  <button
                    aria-label={t("cancelNamed", { alias: player.alias })}
                    className={styles.remove}
                    type="button"
                    onClick={() => cancelSentRequest(player.id)}
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className={styles.count}>
        <Users aria-hidden="true" size={16} />
        {t("friendCount", { count: countFriends(document) })}
      </p>

      {friends.length === 0 ? (
        <p className={styles.empty}>{t("empty")}</p>
      ) : (
        <ul className={styles.list}>
          {friends.map((player) => (
            <li className={styles.row} key={player.id}>
              <Who player={player} />
              <span className={styles.actions}>
                <Link className={styles.versus} href="/versus">
                  <Swords aria-hidden="true" size={15} />
                  {t("playVersus")}
                </Link>
                <button
                  aria-label={t("removeNamed", { alias: player.alias })}
                  className={styles.remove}
                  type="button"
                  onClick={() => removeByPlayerId(player.id)}
                >
                  <UserMinus aria-hidden="true" size={15} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.privacy}>{t("privacy")}</p>
    </div>
  );
}

function Who({ player }: { player: Player }) {
  const t = useTranslations("friends");
  const guardian = getGuardian(player.guardianId);

  return (
    <>
      <span aria-hidden="true" className={styles.avatar}>
        {player.alias.slice(0, 1)}
      </span>
      <span className={styles.who}>
        <span className={styles.alias}>{player.alias}</span>
        {/* A role, never a person: it is all a child needs to know. */}
        {guardian && <span className={styles.guardian}>{t(`guardian.${guardian.role}`)}</span>}
      </span>
    </>
  );
}
