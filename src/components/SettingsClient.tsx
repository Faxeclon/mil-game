"use client";

import { useState } from "react";
import {
  Brain,
  ChevronLeft,
  GraduationCap,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Type
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useProgress } from "@/features/progress/ProgressProvider";
import { signOutTeacher, useTeacherAccount } from "@/features/teacher/teacherAccountStore";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./SettingsClient.module.css";

/**
 * Accessibility and data, in one place.
 *
 * Only what the game genuinely does is offered as a setting. Everything still to be built
 * is listed as such rather than shown as a switch that changes nothing: a game about
 * telling real from fake cannot afford a fake control.
 */
export function SettingsClient() {
  const t = useTranslations("settings");
  const tStorage = useTranslations("storage");
  const tGuardian = useTranslations("guardian");
  const tTeacherAccount = useTranslations("teacherAccount");
  const router = useRouter();
  const {
    hydrated,
    resetProgress,
    completedLevelIds,
    guardian
  } = useProgress();
  const { account: teacherAccount } = useTeacherAccount();
  /*
   * On a teacher's device there is no child playing, so the guest badge and the
   * grown-up's permission are answering a question nobody asked here.
   */
  const isTeacherDevice = teacherAccount !== null && completedLevelIds.length === 0;
  const [confirmingReset, setConfirmingReset] = useState(false);

  const upcoming = [
    { key: "largerText", Icon: Type },
    { key: "neurodivergent", Icon: Brain }
  ] as const;

  return (
    <div className={styles.settings}>
      <Link className={styles.back} href="/">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("back")}
      </Link>

      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>

      <section aria-labelledby="settings-data" className={styles.group}>
        <h2 className={styles.groupTitle} id="settings-data">
          {t("dataTitle")}
        </h2>

        {/* The teacher's own registration: a setting, not a greeting, so it lives here. */}
        {teacherAccount && (
          <div className={styles.row}>
            <span className={styles.rowIcon}>
              <GraduationCap aria-hidden="true" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowName}>{tTeacherAccount("navLabel")}</span>
              <span className={styles.rowDetail}>{teacherAccount.email}</span>
            </span>
            <button
              className={styles.resetStart}
              type="button"
              onClick={() => {
                signOutTeacher();
                router.push("/");
              }}
            >
              {tTeacherAccount("signOut")}
            </button>
          </div>
        )}

        {!isTeacherDevice && (
          <div className={styles.row}>
            <span className={styles.rowIcon}>
              <Smartphone aria-hidden="true" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowName}>{tStorage("guestBadge")}</span>
              <span className={styles.rowDetail}>{tStorage("guestNotice")}</span>
            </span>
          </div>
        )}

        {/* The consent lives with the player it was given for, so it is managed here. */}
        {!isTeacherDevice && (
        <div className={styles.row}>
          <span className={styles.rowIcon}>
            <ShieldCheck aria-hidden="true" size={18} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowName}>{tGuardian("manageTitle")}</span>
            <span className={styles.rowDetail}>
              {guardian ? tGuardian("manageGranted") : tGuardian("manageGuest")}
            </span>
          </span>
          <Link className={styles.resetStart} href="/guardian">
            {guardian ? tGuardian("manageTitle") : tGuardian("askAdult")}
          </Link>
        </div>
        )}

        <div className={styles.resetRow}>
          <p className={styles.resetText}>
            {hydrated ? t("resetCount", { count: completedLevelIds.length }) : t("resetLoading")}
          </p>
          {confirmingReset ? (
            <span className={styles.resetConfirm}>
              <span className={styles.resetQuestion}>{t("resetConfirm")}</span>
              <button
                className={styles.resetYes}
                type="button"
                onClick={() => {
                  resetProgress();
                  setConfirmingReset(false);
                }}
              >
                <Trash2 aria-hidden="true" size={15} />
                {t("resetYes")}
              </button>
              <button className={styles.resetNo} type="button" onClick={() => setConfirmingReset(false)}>
                {t("resetNo")}
              </button>
            </span>
          ) : (
            <button
              className={styles.resetStart}
              disabled={!hydrated}
              type="button"
              onClick={() => setConfirmingReset(true)}
            >
              <Trash2 aria-hidden="true" size={15} />
              {t("resetStart")}
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="settings-upcoming" className={styles.group}>
        <h2 className={styles.groupTitle} id="settings-upcoming">
          {t("upcomingTitle")}
        </h2>
        <p className={styles.groupLead}>{t("upcomingLead")}</p>

        <ul className={styles.upcomingList}>
          {upcoming.map(({ key, Icon }) => (
            <li className={styles.row} key={key}>
              <span className={styles.rowIcon}>
                <Icon aria-hidden="true" size={18} />
              </span>
              <span className={styles.rowText}>
                <span className={styles.rowName}>{t(`${key}Name`)}</span>
                <span className={styles.rowDetail}>{t(`${key}Detail`)}</span>
              </span>
              <span className={styles.soon}>
                <Sparkles aria-hidden="true" size={12} />
                {t("soon")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
