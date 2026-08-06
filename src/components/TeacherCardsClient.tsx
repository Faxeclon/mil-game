"use client";

import { useId, useState } from "react";
import { ChevronLeft, Printer, RotateCcw, Scissors } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  clampStudentCount,
  createClassSet,
  encodeCardPayload,
  MAX_STUDENTS,
  splitIntoPages,
  type TeacherCard,
  type TeacherClassSet
} from "@/features/teacher/classCards";
import { clearClassSet, readClassSet, writeClassSet } from "@/features/teacher/classSetStorage";
import { createQrMatrix, getQrViewBox } from "@/features/teacher/qrMatrix";
import { getLocalPlayedOn } from "@/features/progress/streak";
import { Link } from "@/i18n/navigation";
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
  const countFieldId = useId();
  const nameFieldId = useId();

  // Read once on mount: the set belongs to this device and never changes underneath us.
  const [set, setSet] = useState<TeacherClassSet | null>(() => readClassSet());
  const [studentCount, setStudentCount] = useState("25");
  const [className, setClassName] = useState("");

  const generate = () => {
    const createdOn = getLocalPlayedOn(new Date()) ?? "";
    const created = createClassSet(clampStudentCount(Number(studentCount)), createdOn, className);
    writeClassSet(created);
    setSet(created);
  };

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

        <button className={styles.primary} type="button" onClick={generate}>
          {t("generate")}
        </button>
      </div>
    );
  }

  const pages = splitIntoPages(set.cards);

  return (
    <div className={styles.cards}>
      <div className={styles.noPrint}>
        <Link className={styles.back} href="/teacher">
          <ChevronLeft aria-hidden="true" size={18} />
          {t("back")}
        </Link>

        <h1 className={styles.title}>{set.name ?? t("title")}</h1>
        <p className={styles.lead}>{t("readyLead", { count: set.cards.length })}</p>

        <ol className={styles.steps}>
          <li className={styles.step}>{t("stepPrint")}</li>
          <li className={styles.step}>{t("stepCut")}</li>
          <li className={styles.step}>{t("stepHand")}</li>
          <li className={styles.step}>{t("stepTurn")}</li>
        </ol>

        <p className={styles.keep}>{t("keepToken", { token: set.classToken })}</p>

        <div className={styles.actions}>
          <button className={styles.primary} type="button" onClick={() => window.print()}>
            <Printer aria-hidden="true" size={16} />
            {t("print")}
          </button>
          <button
            className={styles.secondary}
            type="button"
            onClick={() => {
              clearClassSet();
              setSet(null);
            }}
          >
            <RotateCcw aria-hidden="true" size={16} />
            {t("startOver")}
          </button>
        </div>
      </div>

      <div className={styles.sheets}>
        {pages.map((page, pageIndex) => (
          <section className={styles.sheet} key={pageIndex}>
            {page.map((card) => (
              <PrintableCard card={card} classToken={set.classToken} key={card.cardId} labels={{
                top: t("answerA"),
                bottom: t("answerB"),
                student: t("studentNumber", { number: card.number })
              }} />
            ))}
            <p aria-hidden="true" className={styles.cutHint}>
              <Scissors size={13} />
              {t("cutHere")}
            </p>
          </section>
        ))}
      </div>
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
