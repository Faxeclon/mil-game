"use client";

import { BookOpenCheck, ChevronLeft, MessageCircleQuestion, Printer, QrCode, Sparkles, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./TeacherClient.module.css";

const SESSION_STEPS = ["welcome", "play", "versus", "talk", "close"] as const;
const DISCUSSION_PROMPTS = ["one", "two", "three", "four"] as const;
const SETUP_NOTES = ["oneDevice", "noInternet", "noAccounts", "noData"] as const;

/**
 * What a teacher can actually do with this today, on one phone and with no connection.
 *
 * The classroom with accounts, shared codes and a progress dashboard needs a server, so
 * it is named here as still to be built rather than sketched as if it worked. What is
 * offered instead is real: a session plan that runs offline, and a page that prints.
 */
export function TeacherClient() {
  const t = useTranslations("teacher");
  const tCards = useTranslations("cards");

  return (
    <div className={styles.teacher}>
      <Link className={`${styles.back} ${styles.noPrint}`} href="/">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("backHome")}
      </Link>

      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>

      <section aria-labelledby="teacher-setup" className={styles.group}>
        <h2 className={styles.groupTitle} id="teacher-setup">
          {t("setupTitle")}
        </h2>
        <ul className={styles.notes}>
          {SETUP_NOTES.map((note) => (
            <li className={styles.note} key={note}>
              <Sparkles aria-hidden="true" size={15} />
              {t(`setup.${note}`)}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="teacher-session" className={styles.group}>
        <h2 className={styles.groupTitle} id="teacher-session">
          {t("sessionTitle")}
        </h2>
        <p className={styles.groupLead}>{t("sessionLead")}</p>

        <ol className={styles.steps}>
          {SESSION_STEPS.map((step) => (
            <li className={styles.step} key={step}>
              <span className={styles.stepTime}>{t(`session.${step}.time`)}</span>
              <span className={styles.stepBody}>
                <span className={styles.stepName}>{t(`session.${step}.title`)}</span>
                <span className={styles.stepDetail}>{t(`session.${step}.detail`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="teacher-talk" className={styles.group}>
        <h2 className={styles.groupTitle} id="teacher-talk">
          {t("promptsTitle")}
        </h2>
        <p className={styles.groupLead}>{t("promptsLead")}</p>
        <ul className={styles.notes}>
          {DISCUSSION_PROMPTS.map((prompt) => (
            <li className={styles.note} key={prompt}>
              <MessageCircleQuestion aria-hidden="true" size={15} />
              {t(`prompts.${prompt}`)}
            </li>
          ))}
        </ul>
      </section>

      {/* The one classroom tool that already works: printed cards, no student devices. */}
      <section aria-labelledby="teacher-cards" className={styles.group}>
        <h2 className={styles.groupTitle} id="teacher-cards">
          {tCards("cardsLink")}
        </h2>
        <p className={styles.groupLead}>{tCards("cardsLinkHint")}</p>
        <Link className={`${styles.print} ${styles.noPrint}`} href="/teacher/cards">
          <QrCode aria-hidden="true" size={16} />
          {tCards("generate")}
        </Link>
      </section>

      <section aria-labelledby="teacher-soon" className={styles.group}>
        <h2 className={styles.groupTitle} id="teacher-soon">
          {t("soonTitle")}
        </h2>
        <div className={styles.soonRow}>
          <span className={styles.soonIcon}>
            <BookOpenCheck aria-hidden="true" size={18} />
          </span>
          <span className={styles.soonText}>
            <span className={styles.soonName}>{t("onlineTitle")}</span>
            <span className={styles.soonDetail}>{t("onlineDescription")}</span>
          </span>
          <span className={styles.soonBadge}>{t("soon")}</span>
        </div>
        <div className={styles.soonRow}>
          <span className={styles.soonIcon}>
            <Users aria-hidden="true" size={18} />
          </span>
          <span className={styles.soonText}>
            <span className={styles.soonName}>{t("certificateTitle")}</span>
            <span className={styles.soonDetail}>{t("certificateDescription")}</span>
          </span>
          <span className={styles.soonBadge}>{t("soon")}</span>
        </div>
      </section>

      <p className={styles.privacy}>{t("privacyNote")}</p>

      {/* Printing is the offline part of the kit: it needs no server and no connection. */}
      <button className={`${styles.print} ${styles.noPrint}`} type="button" onClick={() => window.print()}>
        <Printer aria-hidden="true" size={16} />
        {t("print")}
      </button>
    </div>
  );
}
