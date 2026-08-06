"use client";

import {
  BookOpenCheck,
  Printer,
  ChevronLeft,
  GraduationCap,
  MessageCircleQuestion,
  QrCode,
  Smartphone,
  Users
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTeacherAccount } from "@/features/teacher/teacherAccountStore";
import { Link } from "@/i18n/navigation";
import styles from "./TeacherClient.module.css";

const CARD_STEPS = ["create", "print", "hand", "ask", "raise"] as const;
const DISCUSSION_PROMPTS = ["one", "two", "three", "four"] as const;

/**
 * How the classroom mode actually works, told as a sequence rather than a feature list.
 *
 * A teacher opening this has one question - what do I do on Monday - so the page answers
 * that first: the two ways to run it, then the cards step by step. The classroom with
 * accounts and a live dashboard needs a server, so it is named as still to be built
 * rather than sketched as if it worked.
 */
export function TeacherClient() {
  const t = useTranslations("teacher");
  const tCards = useTranslations("cards");
  const tAccount = useTranslations("teacherAccount");
  const { hydrated, account } = useTeacherAccount();

  /*
   * The classroom tools belong to a registered teacher. This is not security - nothing
   * here is secret - it is about keeping a children's game from opening onto a menu
   * meant for an adult running a class.
   */
  if (hydrated && !account) {
    return (
      <div className={styles.teacher}>
        <Link className={styles.back} href="/">
          <ChevronLeft aria-hidden="true" size={18} />
          {t("backHome")}
        </Link>
        <h1 className={styles.title}>{tAccount("title")}</h1>
        <p className={styles.lead}>{tAccount("locked")}</p>
        <Link className={styles.print} href="/teacher/join">
          <GraduationCap aria-hidden="true" size={16} />
          {tAccount("register")}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.teacher}>
      <Link className={`${styles.back} ${styles.noPrint}`} href="/">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("backHome")}
      </Link>

      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>

      {/* The two ways to run it, so a teacher can pick before reading any detail. */}
      <section aria-labelledby="teacher-ways" className={styles.group}>
        <h2 className={styles.groupTitle} id="teacher-ways">
          {t("waysTitle")}
        </h2>

        <div className={styles.way}>
          <span className={styles.wayIcon}>
            <Printer aria-hidden="true" size={19} />
          </span>
          <span className={styles.wayText}>
            <span className={styles.wayName}>{t("wayCardsName")}</span>
            <span className={styles.wayDetail}>{tCards("lead")}</span>
          </span>
        </div>

        <div className={styles.way}>
          <span className={styles.wayIcon}>
            <Smartphone aria-hidden="true" size={19} />
          </span>
          <span className={styles.wayText}>
            <span className={styles.wayName}>{t("wayPhonesName")}</span>
            <span className={styles.wayDetail}>{t("wayPhonesDetail")}</span>
          </span>
        </div>
      </section>

      {/* How the printed cards work, end to end. This is the part nobody guesses. */}
      <section aria-labelledby="teacher-cards" className={styles.group}>
        <h2 className={styles.groupTitle} id="teacher-cards">
          {t("cardsHowTitle")}
        </h2>
        <p className={styles.groupLead}>{t("cardsHowLead")}</p>
        <p className={styles.groupLead}>{tCards("lead")}</p>

        <ol className={styles.steps}>
          {CARD_STEPS.map((step, index) => (
            <li className={styles.step} key={step}>
              <span className={styles.stepTime}>{index + 1}</span>
              <span className={styles.stepBody}>
                <span className={styles.stepName}>{t(`cardsHow.${step}.title`)}</span>
                <span className={styles.stepDetail}>{t(`cardsHow.${step}.detail`)}</span>
              </span>
            </li>
          ))}
        </ol>

        <Link className={`${styles.print} ${styles.noPrint}`} href="/teacher/cards">
          <QrCode aria-hidden="true" size={16} />
          {tCards("generate")}
        </Link>
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

    </div>
  );
}
