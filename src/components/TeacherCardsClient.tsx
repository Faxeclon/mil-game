"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, Play, Printer, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  clampStudentCount,
  countSheets,
  createClassSet,
  encodeCardPayload,
  MAX_STUDENTS,
  type TeacherCard,
  type TeacherClassSet
} from "@/features/teacher/classCards";
import { clearClassSet, readClassSet, writeClassSet } from "@/features/teacher/classSetStorage";
import { createQrMatrix, getQrViewBox } from "@/features/teacher/qrMatrix";
import { getLocalPlayedOn } from "@/features/progress/streak";
import { Link, useRouter } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
import styles from "./TeacherCardsClient.module.css";

/**
 * Printable answer cards, so a class can play without a single student device.
 *
 * Each card is one inline SVG: no images to load, nothing fetched, and the same drawing
 * every time so a reprint matches the sheets already handed out. The frame around the
 * code is deliberately asymmetric — a solid bar on the A edge, an outlined one on B —
 * because a QR reader normalises rotation and cannot tell which way up a card is held.
 */
export function TeacherCardsClient() {
  const t = useTranslations("cards");
  const tScan = useTranslations("scan");
  const tLocked = useTranslations("locked");
  const countFieldId = useId();
  const nameFieldId = useId();
  const storageRead = useRef(false);

  // Both server and first client render are neutral. Saved cards are read only after
  // hydration, preventing storage from producing different initial markup.
  const router = useRouter();
  const [set, setSet] = useState<TeacherClassSet | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [studentCount, setStudentCount] = useState("25");
  const [className, setClassName] = useState("");
  const [askingPrinted, setAskingPrinted] = useState(false);

  useEffect(() => {
    const task = window.setTimeout(() => {
      if (storageRead.current) return;
      storageRead.current = true;
      const saved = readClassSet();
      setSet(saved);
      setStorageReady(true);
    }, 0);

    return () => {
      window.clearTimeout(task);
    };
  }, []);

  const generate = () => {
    const createdOn = getLocalPlayedOn(new Date()) ?? "";
    const created = createClassSet(clampStudentCount(Number(studentCount)), createdOn, className);
    writeClassSet(created);
    setSet(created);
  };

  if (!storageReady) return <LoadingRoqui message={tLocked("checking")} title={t("title")} />;

  if (!set) {
    return (
      <div className={styles.cards}>
        <Link className={styles.back} href="/teacher">
          <ChevronLeft aria-hidden="true" size={18} />
          {t("back")}
        </Link>

        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lead}>{t("lead")}</p>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={countFieldId}>
            {t("countLabel")}
          </label>
          <input
            className={styles.input}
            id={countFieldId}
            inputMode="numeric"
            max={MAX_STUDENTS}
            min={1}
            type="number"
            value={studentCount}
            onChange={(event) => setStudentCount(event.target.value)}
          />
          <p className={styles.fieldHint}>{t("countHint", { max: MAX_STUDENTS })}</p>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={nameFieldId}>
            {t("nameLabel")}
          </label>
          <input
            autoComplete="off"
            className={styles.input}
            id={nameFieldId}
            maxLength={24}
            type="text"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          />
          <p className={styles.fieldHint}>{t("nameHint")}</p>
        </div>

        <button className={styles.action} type="button" onClick={generate}>
          {t("generate")}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.cards}>
      <div className={styles.noPrint}>
        {/*
          Leaving and discarding, on the same line and pulling opposite ways.
          Starting over lives up here rather than under the buttons that do the work: it
          belongs with the other way out of this screen, and it is the only one that throws
          the set away - which is what the red is saying, alongside the word.
        */}
        <div className={styles.topRow}>
          <Link className={styles.back} href="/teacher">
            <ChevronLeft aria-hidden="true" size={18} />
            {t("back")}
          </Link>

          <button
            className={styles.discard}
            type="button"
            onClick={() => {
              clearClassSet();
              setSet(null);
            }}
          >
            <RotateCcw aria-hidden="true" size={14} />
            {t("startOver")}
          </button>
        </div>

        <h1 className={styles.title}>{set.name ?? t("title")}</h1>
        <p className={styles.lead}>{t("readyLead", { count: set.cards.length })}</p>

        <ol className={styles.steps}>
          <li className={styles.step}>{t("stepPrint")}</li>
          <li className={styles.step}>{t("stepCut")}</li>
          <li className={styles.step}>{t("stepHand")}</li>
          <li className={styles.step}>{t("stepTurn")}</li>
        </ol>

        {/* The paper cost is shown before printing, not discovered at the printer. */}
        <p className={styles.sheetCount}>{t("sheetCount", { sheets: countSheets(set.cards.length) })}</p>

        {/*
          Nothing here about the set's code.

          It is never typed and never read: it rides inside each QR so the scanner can tell
          one game's cards from another's. A teacher who only ever prints one set at a time
          would be reading about a problem they do not have, and the app already handles it
          without them - a card from elsewhere simply does not register.
        */}

        {/*
          Two shapes, no words.

          Play rather than a scanner, because scanning is not the thing a teacher came to
          do: it is how the round is answered. What they want is to play with the class,
          and the camera is simply how the cards are read along the way.

          The label lives in `aria-label` and `title`, so a screen reader still says it and
          a hesitating teacher still gets it on hover - the word is hidden from the eye,
          not removed.
        */}
        <div className={styles.actions}>
          {/*
            A question, not a link straight through.

            The lesson is a camera pointed at paper: without the sheets in somebody's hands
            there is nothing to read, and a teacher who finds that out with thirty children
            watching finds it out at the worst possible moment. Asked once, here, where the
            printer is still one tap away.
          */}
          <button
            aria-label={tScan("scanLink")}
            className={styles.primary}
            title={tScan("scanLink")}
            type="button"
            onClick={() => setAskingPrinted(true)}
          >
            <Play aria-hidden="true" fill="currentColor" size={22} />
          </button>
          <button
            aria-label={t("print")}
            className={styles.secondary}
            title={t("print")}
            type="button"
            onClick={() => window.print()}
          >
            <Printer aria-hidden="true" size={20} />
          </button>
        </div>

        <p className={styles.previewLabel}>{t("previewLabel")}</p>
      </div>

      {/* One sheet per student: nothing to cut, and the code stays big enough to read
          from the back of the room. */}
      <div className={styles.sheets} data-print-root>
        {set.cards.map((card) => (
          <section className={styles.sheet} key={card.cardId}>
            <PrintableCard
              card={card}
              classToken={set.classToken}
              labels={{
                top: t("answerA"),
                bottom: t("answerB"),
                student: t("studentNumber", { number: card.number })
              }}
            />
          </section>
        ))}
      </div>

      {/*
        A child of the page itself, and the last one, rather than of the block that holds
        the buttons.

        `.cards > *` gives every direct child its own stacking context, so a dialog nested
        inside one of them cannot rise above its siblings however high its z-index goes -
        and the printed sheets, being later in the page, covered it. Out here it is a
        sibling of the sheets and comes after them, so it sits on top for the same reason
        they used to.

        "Not yet" closes and leaves them here, which is the only honest answer: this screen
        is where the printing happens, so there is nowhere better to be sent.
      */}
      {askingPrinted && (
        <div
          aria-label={t("printedQuestion")}
          aria-modal="true"
          className={styles.confirmOverlay}
          role="dialog"
          onClick={() => setAskingPrinted(false)}
        >
          <div className={styles.confirmSheet} onClick={(event) => event.stopPropagation()}>
            <p className={styles.confirmQuestion}>{t("printedQuestion")}</p>
            <p className={styles.confirmDetail}>{t("printedDetail")}</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmYes}
                type="button"
                onClick={() => router.push("/teacher/scan")}
              >
                {t("printedYes")}
              </button>
              <button
                className={styles.confirmNo}
                type="button"
                onClick={() => setAskingPrinted(false)}
              >
                {t("printedNo")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type CardLabels = { top: string; bottom: string; student: string };

function PrintableCard({
  card,
  classToken,
  labels
}: {
  card: TeacherCard;
  classToken: string;
  labels: CardLabels;
}) {
  const matrix = createQrMatrix(encodeCardPayload(classToken, card.cardId));

  return (
    <article className={styles.card}>
      {/* Solid bar on the A edge, outlined on the B edge. The asymmetry is what tells
          the camera which way up the card is held; the code itself cannot. */}
      <p className={styles.edgeA}>
        <span aria-hidden="true" className={styles.arrowUp} />
        {labels.top}
      </p>

      <div className={styles.cardBody}>
        <span className={styles.cardNumber}>{card.number}</span>
        <svg
          aria-label={labels.student}
          className={styles.qr}
          role="img"
          viewBox={getQrViewBox(matrix)}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill="#ffffff" height="100%" width="100%" x={-4} y={-4} />
          <path d={matrix.path} fill="#000000" />
        </svg>
      </div>

      <p className={styles.edgeB}>
        {labels.bottom}
        <span aria-hidden="true" className={styles.arrowDown} />
      </p>
    </article>
  );
}
