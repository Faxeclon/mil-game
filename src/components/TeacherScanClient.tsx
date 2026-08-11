"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import {
  Camera,
  CameraOff,
  Check,
  ChevronLeft,
  Clapperboard,
  FileSearch,
  Layers3,
  Play,
  RotateCcw,
  ScanLine,
  SearchCheck,
  SquareCheckBig,
  X,
  type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  categories,
  getMissionsByCategory,
  islands,
  missionBlueprint,
  type IslandKey,
  type MissionBlueprint
} from "@/features/levels/levelModel";
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
  getTally,
  type ScanSession
} from "@/features/teacher/scanSession";
import { Link } from "@/i18n/navigation";
import { ImageZoom } from "./ImageZoom";
import { LoadingRoqui } from "./LoadingRoqui";
import {
  getNodePositions,
  getNodeSide,
  MapEnvironment,
  MapSky,
  MissionMarker,
  MissionTrail
} from "./MissionMap";
import islandStyles from "./IslandView.module.css";
import mapStyles from "./MissionMap.module.css";
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

function islandOf(category: string): IslandKey | undefined {
  return categories.find((entry) => entry.key === category)?.island;
}

/**
 * The same drawing the map gives each island, so a teacher and a child point at the same
 * thing when they talk about one.
 *
 * Only the icon travels. The map's colours say available, locked or completed - states a
 * class does not have - and repainting them per island here would invent a second colour
 * code that nothing else in the game reads.
 */
const islandIcons: Record<IslandKey, LucideIcon> = {
  training: SearchCheck,
  difference: Layers3,
  source: FileSearch,
  videos: Clapperboard
};

/**
 * The askable missions, in islands rather than in one column.
 *
 * Thirteen buttons of equal weight is a list to be read; four short groups is a shape to
 * be scanned. Same missions, same order - only the grouping is new.
 */
const missionsByIsland = islands
  .map((island) => {
    const missions = askableMissions.filter((mission) => islandOf(mission.category) === island.key);
    return {
      key: island.key,
      missions,
      /*
       * What is actually inside, read off the missions themselves.
       *
       * The island names are written for a child - "Caza de pistas", "Cuadro a cuadro" -
       * and they set a tone rather than describe a topic. A teacher choosing what to put
       * in front of their class needs the topic, so the island says both: its own name,
       * and the subjects it is made of.
       */
      topics: [...new Set(missions.map((mission) => mission.category))]
    };
  })
  .filter((group) => group.missions.length > 0);

/**
 * Where a class that has never played should start.
 *
 * Not a separate lesson: it is the first mission of the training island, the same one a
 * child meets alone. A teacher opening this screen for the first time should not have to
 * work out which of thirteen names is the beginning.
 */
const tutorialMission = missionsByIsland[0]?.missions[0] ?? askableMissions[0];

/** Only islands with something a class can answer become a stop on the teacher's trail. */
const islandStops = missionsByIsland;
const islandPositions = getNodePositions(islandStops.length);

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
  const [openIsland, setOpenIsland] = useState<IslandKey | null>(null);
  /** Asked for only when the camera cannot do the reading. */
  const [markingByHand, setMarkingByHand] = useState(false);
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
    /** Opens a mission for the whole class: same act whichever button asked for it. */
    const startMission = (mission: MissionBlueprint) => {
      setLesson(createLesson(mission.packId ?? mission.id));
      setRounds(buildClassQuestions(mission));
      setQuestionIndex(0);
      beginQuestion(set);
    };

    /*
     * The island a teacher opened, on a screen of its own.
     *
     * Two steps, like the child's game: the archipelago, then one island. Showing the
     * missions underneath the trail meant the thing they had just tapped scrolled itself
     * out of sight, and the answer arrived below the question.
     */
    const opened = missionsByIsland.find((group) => group.key === openIsland);
    if (opened) {
      return (
        <div className={styles.scan}>
          <button className={styles.leaveLesson} type="button" onClick={() => setOpenIsland(null)}>
            <ChevronLeft aria-hidden="true" size={18} />
            {t("backToIslands")}
          </button>

          <h1 className={styles.title}>{tIslands(`list.${opened.key}.title`)}</h1>
          <p className={styles.lead}>{tIslands(`list.${opened.key}.description`)}</p>

          {/*
            The child's island, drawn for a teacher: a card per category, and inside it the
            chain of beads. Borrowed rather than redrawn, so the two screens stay the same
            screen. What is left out is what a class does not have - locks, stars, best
            runs and the progress bar - so every bead simply plays.
          */}
          <div className={`${islandStyles.island} ${islandStyles.embedded}`}>
            {opened.topics.map((topic) => {
              const missions = opened.missions.filter((mission) => mission.category === topic);

              return (
                <section
                  aria-labelledby={`teacher-category-${topic}`}
                  className={`${islandStyles.group} ${islandStyles.available}`}
                  key={topic}
                >
                  <header className={islandStyles.groupHeader}>
                    <h2 className={islandStyles.groupTitle} id={`teacher-category-${topic}`}>
                      {tIslands(`categories.${topic}.title`)}
                    </h2>
                  </header>

                  <ol className={islandStyles.chain}>
                    {missions.map((mission) => {
                      const { askable } = countAskableRounds(mission);
                      const order =
                        getMissionsByCategory(mission.category).findIndex((entry) => entry.id === mission.id) + 1;

                      return (
                        <li className={`${islandStyles.step} ${islandStyles.available}`} key={mission.id}>
                          <button
                            className={islandStyles.mission}
                            type="button"
                            onClick={() => startMission(mission)}
                          >
                            <span className={islandStyles.orb}>
                              <Play aria-hidden="true" fill="currentColor" size={22} />
                              <span className={islandStyles.orbNumber}>{order}</span>
                            </span>
                            <span className={islandStyles.caption}>
                              <span className={islandStyles.mode}>{tIslands(`modes.${mission.mode}`)}</span>
                              <span className={islandStyles.timing}>
                                {t("questionCount", { count: askable })}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.scan}>
        <Link className={styles.back} href="/teacher">
          <ChevronLeft aria-hidden="true" size={18} />
          {tCards("back")}
        </Link>

        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lead}>{t("chooseLead", { count: set.cards.length })}</p>

        {/*
          One obvious way in, and the rest kept out of the way until asked for.

          A teacher standing in front of a class that has never played needs a beginning,
          not an inventory: thirteen names of equal weight made them choose before they
          knew what they were choosing between. The one who already knows the game opens
          the list in a tap and finds it exactly as it was.
        */}
        {tutorialMission && (
          <button className={styles.startTutorial} type="button" onClick={() => startMission(tutorialMission)}>
            <Play aria-hidden="true" fill="currentColor" size={18} />
            <span className={styles.startTutorialText}>
              <span className={styles.startTutorialName}>{t("startTutorial")}</span>
              <span className={styles.startTutorialHint}>{t("startTutorialHint")}</span>
            </span>
          </button>
        )}

        <p className={styles.chooseOther}>{t("chooseOther")}</p>

        {/*
          The teacher's own board, not the child's map.

          A child's map is a journey: it shows where they are, what is shut and what they
          have earned. None of that exists for a class, so this is built for the question a
          teacher actually has - which island, then which mission - and answers it with
          everything on screen at once, because they are choosing while thirty children
          wait rather than exploring at their own pace.

          Islands are told apart by their icon, the same one the map draws. Not by colour:
          on the map colour means available, locked or completed, and giving each island a
          hue of its own here would invent a second colour code nothing else can read.
        */}
        {/*
          The child's map, drawn for a teacher.

          The same trail, the same floating islands, the same sky and ground - imported
          from the map itself rather than copied, so the two cannot drift apart. What is
          left out is everything the map says about progress: no padlocks, no hourglasses,
          no medals, no "you are here". A class has no progress to show, so every island is
          simply open, and tapping one lists its missions underneath.
        */}
        {/*
          Inside `.map`, because that is where the map keeps its palette.
          Every colour it draws with - the orange of an open island, the ink of a caption,
          the grey of the trail - is a custom property declared on that class. Drawing the
          journey outside it left every one of them undefined, so the whole archipelago
          came out in fallback grey.
        */}
        <div className={mapStyles.map}>
        <div
          className={`${mapStyles.journey} ${mapStyles.compact}`}
          style={{ "--island-count": islandStops.length } as CSSProperties}
        >
          <MapEnvironment />
          <MapSky />
          <MissionTrail
            completedFlags={islandStops.map(() => false)}
            nextSegmentIndex={-1}
            positions={islandPositions}
          />
          <ol aria-label={t("chooseOther")} className={mapStyles.path}>
            {islandStops.map((group, index) => {
              const Icon = islandIcons[group.key];
              const isOpen = openIsland === group.key;
              const side = getNodeSide(index);

              return (
                <li
                  className={`${mapStyles.step} ${mapStyles.available} ${
                    side === "left" ? mapStyles.stepLeft : mapStyles.stepRight
                  }`}
                  key={group.key}
                  style={
                    {
                      "--node-x": `${islandPositions[index].x}%`,
                      "--node-y": `${islandPositions[index].y}%`
                    } as CSSProperties
                  }
                >
                  <MissionMarker kind={islands[index]?.icon ?? "training"} />
                  <div className={mapStyles.nodeStage}>
                    {/* Tap an island, its missions appear below as beads; tap one, it starts. */}
                    <button
                      aria-expanded={isOpen}
                      className={mapStyles.world}
                      type="button"
                      onClick={() => setOpenIsland(isOpen ? null : group.key)}
                    >
                      <span className={mapStyles.orb}>
                        <Icon aria-hidden="true" size={44} strokeWidth={2.1} />
                        <span className={mapStyles.orbNumber}>{index + 1}</span>
                      </span>
                      <span className={mapStyles.caption}>
                        <span className={mapStyles.title}>{tIslands(`list.${group.key}.title`)}</span>
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        </div>


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
      </div>
    );
  }

  const currentSession = session ?? createScanSession(set);
  const tally = getTally(currentSession, set);
  const closed = currentSession.status === "closed";
  const correct = round.correct;
  const rightCount = set.cards.filter((card) => currentSession.answers[card.cardId] === correct).length;

  // ── Asking one question ────────────────────────────────────────────────────────────
  return (
    /*
     * The chrome goes, the same way it goes for a child playing.
     * A lesson is a room looking at one screen; a header and a bar of destinations invite
     * a tap that would abandon it mid-question, and cost the images the room they need.
     */
    <div className={`${styles.scan} app-chrome-hidden`}>
      {/*
        The way out of a lesson already under way.

        There was none: a teacher who opened the wrong mission was held there until every
        question had been asked, in front of the class. It asks first, because leaving
        drops the answers scanned so far and there is no getting them back - and it hands
        the camera back on the way out rather than leaving it lit.
      */}
      <button
        className={styles.leaveLesson}
        type="button"
        onClick={() => {
          stop();
          setLesson(null);
          setRounds([]);
          setQuestionIndex(0);
          setSession(null);
          sessionRef.current = null;
        }}
      >
        <ChevronLeft aria-hidden="true" size={18} />
        {t("leaveLesson")}
      </button>

      {/*
        The count of cards in sits beside the question, not in a panel of its own further
        down. It is glanced at between looking up at the room, so it belongs where the eye
        already goes - and up here it costs no vertical room at all.
      */}
      <div className={styles.questionHead}>
        <h1 className={styles.title}>{t("questionOf", { current: questionIndex + 1, total: rounds.length })}</h1>
        {!closed && (
          <p className={styles.scannedChip}>
            <span className={styles.scannedLabel}>{t("scanned")}</span>
            <span className={styles.scannedValue}>
              {t("scannedOf", { done: tally.answered, total: set.cards.length })}
            </span>
          </p>
        )}

      </div>
      <p className={styles.lead}>{closed ? t("closedLead") : t("lead")}</p>

      <div aria-live="polite" className={styles.srOnly}>
        {announcement}
      </div>

      {/* What the class is looking at. Two pictures when they are choosing between them,
          one when the question is who made it - and the sides say which is which. */}
      {round.kind === "single" ? (
        <figure className={styles.single}>
          {/* A class four rows back needs this more than anyone. */}
          <div className={styles.singleMedia}>
            <Image
              alt={tTutorial(round.media[0].altKey)}
              fill
              sizes="(max-width: 700px) 90vw, 420px"
              src={round.media[0].src}
            />
            <ImageZoom alt={tTutorial(round.media[0].altKey)} src={round.media[0].src} />
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
                  <ImageZoom alt={tTutorial(asset.altKey)} src={asset.src} />
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

      {/*
        What the letters mean, and only where they are not already on screen.
        With two pictures the images carry A and B themselves, so spelling out "A) A" is
        the screen reading its own labels aloud. With one picture there is nothing to
        compare and the letters stand for whole answers - "made with AI", "taken with a
        camera" - which nobody could guess from a card that just says B.
      */}
      {round.kind === "single" && (
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
      )}

      {/*
        While the answers are open, the only number that helps is how many cards are in.
        The split between A and B is a half-counted result: it changes with every card
        still being lifted, and reading it aloud - or letting the class read it off the
        screen - tells thirty children which way the room is leaning before they have
        finished deciding. It appears once the answers close, with the right side marked.
      */}
      {closed && (
        <dl className={styles.tally}>
          <div className={styles.tallyItem}>
            <dt className={styles.tallyLabel}>{t("scanned")}</dt>
            <dd className={styles.tallyValue}>
              {t("scannedOf", { done: tally.answered, total: set.cards.length })}
            </dd>
          </div>
          <div className={correct === "A" ? styles.tallyRight : styles.tallyItem}>
            <dt className={styles.tallyLabel}>{tCards("answerA")}</dt>
            <dd className={styles.tallyValue}>{tally.a}</dd>
          </div>
          <div className={correct === "B" ? styles.tallyRight : styles.tallyItem}>
            <dt className={styles.tallyLabel}>{tCards("answerB")}</dt>
            <dd className={styles.tallyValue}>{tally.b}</dd>
          </div>
        </dl>
      )}

      {/*
        The camera's own block exists only while it has something to show - the picture it
        is reading, or why it could not open. Idle, it held a bordered panel around nothing
        and pushed the class list down the screen for it.
      */}
      {!closed && camera.kind !== "idle" && (
        <section aria-labelledby="scan-camera-title" className={styles.cameraBox}>
          {/*
            One round button, no heading and no caption while the camera is off.
            Nothing here needs explaining: a camera icon on a scanning screen is already
            the sentence. The words stay in `aria-label` and `title`, so a screen reader
            still hears them and a hesitating teacher still gets them on hover.
          */}
          <h2 className={styles.srOnly} id="scan-camera-title">
            {t("cameraTitle")}
          </h2>

          <video
            className={camera.kind === "running" ? styles.video : styles.videoHidden}
            muted
            playsInline
            ref={videoRef}
          />

          {camera.kind === "starting" && <p className={styles.failureText} role="status">{t("cameraStarting")}</p>}

          {/* Each reason gets its own way out, because "something failed" leaves nobody
              anywhere. The manual list below keeps working in every one of them. */}
          {camera.kind === "failed" && (
            <div className={styles.failure} role="status">
              <p className={styles.failureText}>{t(`camera.${camera.reason}`)}</p>
              <p className={styles.failureHint}>{t("manualFallback")}</p>
              {!markingByHand && (
                <button className={styles.secondary} type="button" onClick={() => setMarkingByHand(true)}>
                  <SquareCheckBig aria-hidden="true" size={16} />
                  {t("markByHand")}
                </button>
              )}
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

      {/*
        Twenty-five names down the screen while the camera is reading them is a list nobody
        looks at, so it waits until the answers close and it can say who got it right.

        The one exception is asked for, not assumed: a camera that will not open leaves
        marking by hand as the only way the lesson happens, so the failure offers a button
        that brings the list out. Hidden by default, one tap away when it is the only thing
        that works.
      */}
      {(closed || markingByHand) && (
      <section aria-labelledby="scan-list-title" className={styles.listBox}>
        <div className={styles.listHead}>
          <h2 className={styles.sectionTitle} id="scan-list-title">
            {closed ? t("resultTitle") : t("listTitle")}
          </h2>
        </div>

        {closed && <p className={styles.summary}>{t("groupResult", { right: rightCount, total: set.cards.length })}</p>}

        {/*
          Nothing here about who is missing. The counter above says how many are in, and
          the list below says which ones by name - repeating it as a sentence was the same
          fact told a third time, in the middle of a screen read while standing.
        */}

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
      )}

      <div className={styles.actions}>
        {/* The camera sits above the button that ends the scanning it feeds. */}
        {!closed && camera.kind === "idle" && (
          <button
            aria-label={t("startCamera")}
            className={styles.cameraToggle}
            title={t("startCamera")}
            type="button"
            onClick={() => void start()}
          >
            <Camera aria-hidden="true" size={22} />
          </button>
        )}

        {!closed && camera.kind === "running" && (
          <button
            aria-label={t("stopCamera")}
            className={styles.cameraToggleOff}
            title={t("stopCamera")}
            type="button"
            onClick={stop}
          >
            <CameraOff aria-hidden="true" size={20} />
          </button>
        )}

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
    </div>
  );
}
