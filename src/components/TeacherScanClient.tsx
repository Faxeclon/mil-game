"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, CameraOff, Check, ChevronLeft, RotateCcw, ScanLine, SquareCheckBig, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { getMissionsByCategory, missionBlueprint } from "@/features/levels/levelModel";
import {
  buildClassQuestions,
  canBeAskedInClass,
  countAskableRounds,
  type ClassQuestion
} from "@/features/teacher/classQuestions";
import type { CardAnswer, TeacherCard, TeacherClassSet } from "@/features/teacher/classCards";
import { readClassSet } from "@/features/teacher/classSetStorage";
import {
  canDetectCodes,
  closeCamera,
  createCardDetector,
  openCamera,
  SCAN_INTERVAL_MS,
  type CameraFailure,
  type CardDetector
} from "@/features/teacher/cardScanner";
import {
  createLesson,
  getHardestQuestion,
  getLessonSummary,
  getStudentResults,
  recordQuestion,
  type ClassLesson
} from "@/features/teacher/classLesson";
import {
  applyDetection,
  closeAnswers,
  createScanSession,
  getPendingCards,
  getTally,
  type ScanSession
} from "@/features/teacher/scanSession";
import { Link } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
import styles from "./TeacherScanClient.module.css";

type CameraState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "running" }
  | { kind: "failed"; reason: CameraFailure };

/**
 * Every mission a class can actually answer with paper.
 *
 * What A and B mean changes with the mission - two pictures, or one picture and who made
 * it - so the list is not restricted to one shape. Only a mission with nothing a card can
 * carry is left out.
 */
const askableMissions = missionBlueprint.filter(canBeAskedInClass);

/**
 * A whole lesson run from one phone: ask, scan, correct, and move on.
 *
 * The important change over a bare scanner is that Kikiria owns the answer key. The pack
 * already declares which image was made with AI, so a question corrects itself the moment
 * the answers close and the teacher never has to remember which side was right while
 * thirty children wave paper at them.
 *
 * The rules live in `scanSession` and `classLesson`, both covered by tests. This file is
 * the screen: what is shown, what is announced, and giving the camera back when it is done.
 */
export function TeacherScanClient() {
  const t = useTranslations("scan");
  const tCards = useTranslations("cards");
  const tIslands = useTranslations("islands");
  const tTutorial = useTranslations("tutorial");
  const tLocked = useTranslations("locked");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<ScanSession | null>(null);
  const detectorRef = useRef<CardDetector | null>(null);
  const cameraStartTokenRef = useRef(0);

  const [set, setSet] = useState<TeacherClassSet | null>(null);
  const [ready, setReady] = useState(false);
  const [lesson, setLesson] = useState<ClassLesson | null>(null);
  const [rounds, setRounds] = useState<readonly ClassQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [session, setSession] = useState<ScanSession | null>(null);
  const [camera, setCamera] = useState<CameraState>({ kind: "idle" });
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const task = window.setTimeout(() => {
      setSet(readClassSet());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  const stop = useCallback(() => {
    // Invalidate an in-flight permission prompt before releasing any current stream.
    cameraStartTokenRef.current += 1;
    closeCamera(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera({ kind: "idle" });
  }, []);

  // The camera must never outlive the screen, on a device that has to last a school day.
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    const startToken = ++cameraStartTokenRef.current;
    setCamera({ kind: "starting" });
    // The decoder and the camera are both settled here, in the handler the teacher tapped,
    // so the sweep below never has to change state to report a browser it cannot use.
    const detector = canDetectCodes() ? createCardDetector() : null;
    if (!detector) {
      if (startToken === cameraStartTokenRef.current) setCamera({ kind: "failed", reason: "unsupported" });
      return;
    }
    detectorRef.current = detector;

    const result = await openCamera();
    if (startToken !== cameraStartTokenRef.current) {
      if (result.kind === "ready") closeCamera(result.stream);
      return;
    }
    if (result.kind === "failed") {
      setCamera({ kind: "failed", reason: result.reason });
      return;
    }
    streamRef.current = result.stream;
    if (videoRef.current) {
      videoRef.current.srcObject = result.stream;
      await videoRef.current.play().catch(() => undefined);
    }
    setCamera({ kind: "running" });
  }, []);

  // The sweep: look at a frame every so often, fold whatever it holds into the session.
  useEffect(() => {
    const detector = detectorRef.current;
    if (camera.kind !== "running" || !set || !detector) return;

    let cancelled = false;
    let busy = false;

    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (busy || cancelled || !video || video.readyState < 2) return;
      busy = true;
      try {
        const detections = await detector.detect(video);
        if (cancelled || detections.length === 0) return;

        let current = sessionRef.current;
        if (!current) return;
        let spoken = "";

        for (const detection of detections) {
          const { session: next, outcome } = applyDetection(current, set, detection);
          current = next;
          if (outcome.kind === "recorded" || outcome.kind === "changed") {
            spoken = t("announceAnswer", { number: outcome.card.number, answer: outcome.answer });
          } else if (outcome.kind === "ambiguous") {
            spoken = t("announceAmbiguous", { number: outcome.card.number });
          }
        }

        sessionRef.current = current;
        setSession(current);
        if (spoken) setAnnouncement(spoken);
      } finally {
        busy = false;
      }
    }, SCAN_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [camera.kind, set, t]);

  const beginQuestion = useCallback((from: TeacherClassSet) => {
    const fresh = createScanSession(from);
    sessionRef.current = fresh;
    setSession(fresh);
    setAnnouncement("");
  }, []);

  const mark = useCallback(
    (card: TeacherCard, answer: CardAnswer) => {
      const current = sessionRef.current;
      if (!current || current.status === "closed") return;
      const next: ScanSession = { ...current, answers: { ...current.answers, [card.cardId]: answer } };
      sessionRef.current = next;
      setSession(next);
      setAnnouncement(t("announceAnswer", { number: card.number, answer }));
    },
    [t]
  );

  if (!ready) return <LoadingRoqui message={tLocked("checking")} title={t("title")} />;

  // Scanning cards that were never printed is not a state worth designing for.
  if (!set) {
    return (
      <div className={styles.scan}>
        <Link className={styles.back} href="/teacher">
          <ChevronLeft aria-hidden="true" size={18} />
          {tCards("back")}
        </Link>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lead}>{t("noSet")}</p>
        <Link className={styles.primary} href="/teacher/cards">
          {tCards("cardsLink")}
        </Link>
      </div>
    );
  }

  // ── Choosing what the class will be asked ──────────────────────────────────────────
  if (!lesson) {
    return (
      <div className={styles.scan}>
        <Link className={styles.back} href="/teacher">
          <ChevronLeft aria-hidden="true" size={18} />
          {tCards("back")}
        </Link>

        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lead}>{t("chooseLead", { count: set.cards.length })}</p>

        <ul className={styles.missionList}>
          {askableMissions.map((mission) => {
            const { askable, total } = countAskableRounds(mission);
            const order = getMissionsByCategory(mission.category).findIndex((entry) => entry.id === mission.id) + 1;

            return (
              <li key={mission.id}>
                <button
                  className={styles.missionButton}
                  type="button"
                  onClick={() => {
                    setLesson(createLesson(mission.packId ?? mission.id));
                    setRounds(buildClassQuestions(mission));
                    setQuestionIndex(0);
                    beginQuestion(set);
                  }}
                >
                  <span className={styles.missionName}>
                    {tIslands("missionIdentity", {
                      category: tIslands(`categories.${mission.category}.title`),
                      number: order
                    })}
                  </span>
                  <span className={styles.missionMeta}>
                    {tIslands(`modes.${mission.mode}`)} · {t("questionCount", { count: askable })}
                  </span>
                  {/* A mission that loses a round to the uncertain answer says so here,
                      rather than quietly asking fewer questions than it has. */}
                  {askable < total && (
                    <span className={styles.missionNote}>{t("someRoundsSkipped", { total })}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className={styles.privacy}>{t("privacy")}</p>
      </div>
    );
  }

  const round = rounds[questionIndex];
  const finished = !round;

  // ── The lesson is over ─────────────────────────────────────────────────────────────
  if (finished) {
    const summary = getLessonSummary(lesson, set);
    const hardest = getHardestQuestion(lesson);
    const results = getStudentResults(lesson, set);

    return (
      <div className={styles.scan}>
        <h1 className={styles.title}>{t("lessonDoneTitle")}</h1>
        <p className={styles.lead}>
          {t("lessonDoneLead", { questions: summary.questionsAsked, right: summary.right, answered: summary.answered })}
        </p>

        {hardest && (
          <p className={styles.summary}>
            {t("hardestQuestion", {
              number: hardest.index + 1,
              wrong: hardest.answered - hardest.right
            })}
          </p>
        )}

        {summary.incomplete > 0 && <p className={styles.pending}>{t("incomplete", { count: summary.incomplete })}</p>}

        <section aria-labelledby="lesson-results" className={styles.listBox}>
          <h2 className={styles.sectionTitle} id="lesson-results">
            {t("perStudent")}
          </h2>
          <ul className={styles.list}>
            {results.map((result) => (
              <li className={styles.row} key={result.card.cardId}>
                <span className={styles.rowNumber}>{result.card.number}</span>
                <span className={styles.rowAnswer}>
                  {t("studentScore", { right: result.right, asked: result.asked })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.actions}>
          <button
            className={styles.primary}
            type="button"
            onClick={() => {
              setLesson(null);
              setRounds([]);
              setQuestionIndex(0);
              setSession(null);
              sessionRef.current = null;
            }}
          >
            <RotateCcw aria-hidden="true" size={16} />
            {t("newLesson")}
          </button>
          <Link className={styles.secondary} href="/teacher">
            {tCards("back")}
          </Link>
        </div>

        <p className={styles.privacy}>{t("privacy")}</p>
      </div>
    );
  }

  const currentSession = session ?? createScanSession(set);
  const tally = getTally(currentSession, set);
  const pending = getPendingCards(currentSession, set);
  const closed = currentSession.status === "closed";
  const correct = round.correct;
  const rightCount = set.cards.filter((card) => currentSession.answers[card.cardId] === correct).length;

  // ── Asking one question ────────────────────────────────────────────────────────────
  return (
    <div className={styles.scan}>
      <h1 className={styles.title}>{t("questionOf", { current: questionIndex + 1, total: rounds.length })}</h1>
      <p className={styles.lead}>{closed ? t("closedLead") : t("lead")}</p>

      <div aria-live="polite" className={styles.srOnly}>
        {announcement}
      </div>

      {/* What the class is looking at. Two pictures when they are choosing between them,
          one when the question is who made it - and the sides say which is which. */}
      {round.kind === "single" ? (
        <figure className={styles.single}>
          <div className={styles.singleMedia}>
            <Image
              alt={tTutorial(round.media[0].altKey)}
              fill
              sizes="(max-width: 700px) 90vw, 420px"
              src={round.media[0].src}
            />
          </div>
        </figure>
      ) : (
        <div className={styles.options}>
          {round.media.map((asset, index) => {
            const letter = index === 0 ? "A" : "B";
            const isRight = closed && correct === letter;

            return (
              <figure className={isRight ? styles.optionRight : styles.option} key={asset.id}>
                <div className={styles.optionMedia}>
                  <Image
                    alt={tTutorial(asset.altKey)}
                    fill
                    sizes="(max-width: 700px) 45vw, 320px"
                    src={asset.src}
                  />
                </div>
                <figcaption className={styles.optionLabel}>
                  {letter}
                  {/* Never colour alone: the tick states which one it was. */}
                  {isRight && <Check aria-label={t("wasCorrect")} className={styles.right} size={18} />}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}

      {/* The teacher reads this out before anybody lifts a card. */}
      <dl className={styles.meaning}>
        {(["A", "B"] as const).map((letter, index) => {
          const isRight = closed && correct === letter;

          return (
            <div className={isRight ? styles.meaningRight : styles.meaningItem} key={letter}>
              <dt className={styles.meaningLetter}>{letter}</dt>
              <dd className={styles.meaningText}>
                {tCards(round.labelKeys[index])}
                {isRight && <Check aria-label={t("wasCorrect")} className={styles.right} size={16} />}
              </dd>
            </div>
          );
        })}
      </dl>

      <dl className={styles.tally}>
        <div className={styles.tallyItem}>
          <dt className={styles.tallyLabel}>{t("scanned")}</dt>
          <dd className={styles.tallyValue}>{t("scannedOf", { done: tally.answered, total: set.cards.length })}</dd>
        </div>
        <div className={styles.tallyItem}>
          <dt className={styles.tallyLabel}>{tCards("answerA")}</dt>
          <dd className={styles.tallyValue}>{tally.a}</dd>
        </div>
        <div className={styles.tallyItem}>
          <dt className={styles.tallyLabel}>{tCards("answerB")}</dt>
          <dd className={styles.tallyValue}>{tally.b}</dd>
        </div>
      </dl>

      {!closed && (
        <section aria-labelledby="scan-camera-title" className={styles.cameraBox}>
          <h2 className={styles.sectionTitle} id="scan-camera-title">
            {t("cameraTitle")}
          </h2>

          <video
            className={camera.kind === "running" ? styles.video : styles.videoHidden}
            muted
            playsInline
            ref={videoRef}
          />

          {camera.kind === "idle" && (
            <button className={styles.primary} type="button" onClick={() => void start()}>
              <Camera aria-hidden="true" size={16} />
              {t("startCamera")}
            </button>
          )}

          {camera.kind === "starting" && <p className={styles.failureText} role="status">{t("cameraStarting")}</p>}

          {camera.kind === "running" && (
            <button className={styles.secondary} type="button" onClick={stop}>
              <CameraOff aria-hidden="true" size={16} />
              {t("stopCamera")}
            </button>
          )}

          {/* Each reason gets its own way out, because "something failed" leaves nobody
              anywhere. The manual list below keeps working in every one of them. */}
          {camera.kind === "failed" && (
            <div className={styles.failure} role="status">
              <p className={styles.failureText}>{t(`camera.${camera.reason}`)}</p>
              <p className={styles.failureHint}>{t("manualFallback")}</p>
              {camera.reason !== "unsupported" && (
                <button className={styles.secondary} type="button" onClick={() => void start()}>
                  <RotateCcw aria-hidden="true" size={16} />
                  {t("retryCamera")}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="scan-list-title" className={styles.listBox}>
        <h2 className={styles.sectionTitle} id="scan-list-title">
          {closed ? t("resultTitle") : t("listTitle")}
        </h2>

        {closed && <p className={styles.summary}>{t("groupResult", { right: rightCount, total: set.cards.length })}</p>}

        {!closed && pending.length > 0 && (
          <p className={styles.pending}>
            {t("stillMissing", { numbers: pending.map((card) => card.number).join(", ") })}
          </p>
        )}

        <ul className={styles.list}>
          {set.cards.map((card) => {
            const answer = currentSession.answers[card.cardId];
            const isRight = closed && answer === correct;

            return (
              <li className={styles.row} key={card.cardId}>
                <span className={styles.rowNumber}>{card.number}</span>

                <span className={styles.rowAnswer}>
                  {answer ?? t("waiting")}
                  {closed &&
                    answer !== undefined &&
                    (isRight ? (
                      <Check aria-label={t("right")} className={styles.right} size={16} />
                    ) : (
                      <X aria-label={t("wrong")} className={styles.wrong} size={16} />
                    ))}
                </span>

                {!closed && (
                  <span className={styles.rowActions}>
                    {(["A", "B"] as const).map((letter) => (
                      <button
                        aria-label={t("markAs", { number: card.number, answer: letter })}
                        aria-pressed={answer === letter}
                        className={styles.markButton}
                        key={letter}
                        type="button"
                        onClick={() => mark(card, letter)}
                      >
                        {letter}
                      </button>
                    ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className={styles.actions}>
        {!closed ? (
          <button
            className={styles.primary}
            type="button"
            onClick={() => {
              stop();
              const next = closeAnswers(currentSession);
              sessionRef.current = next;
              setSession(next);
              setLesson(recordQuestion(lesson, round, next.answers));
            }}
          >
            <SquareCheckBig aria-hidden="true" size={16} />
            {t("closeAnswers")}
          </button>
        ) : (
          <button
            className={styles.primary}
            type="button"
            onClick={() => {
              setQuestionIndex(questionIndex + 1);
              beginQuestion(set);
            }}
          >
            <ScanLine aria-hidden="true" size={16} />
            {questionIndex + 1 < rounds.length ? t("nextQuestion") : t("seeLesson")}
          </button>
        )}
      </div>

      <p className={styles.privacy}>{t("privacy")}</p>
    </div>
  );
}
