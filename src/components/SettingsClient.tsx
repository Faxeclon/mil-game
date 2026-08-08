"use client";

import { useState } from "react";
import {
  ALargeSmall,
  Check,
  ChevronLeft,
  GraduationCap,
  Pause,
  ShieldCheck,
  Smartphone,
  Trash2,
  Type,
  Volume2
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PRESENTATION_KEYS } from "@/features/accessibility/accessibilitySettings";
import {
  togglePresentationSetting,
  useAccessibility
} from "@/features/accessibility/accessibilityStore";
import { useSpeech } from "@/features/speech/useSpeech";
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
  const tModes = useTranslations("accessModes");
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
  const accessibility = useAccessibility();
  const speech = useSpeech();
  /*
   * On a teacher's device there is no child playing, so the guest badge and the
   * grown-up's permission are answering a question nobody asked here.
   */
  const isTeacherDevice = teacherAccount !== null && completedLevelIds.length === 0;
  const [confirmingReset, setConfirmingReset] = useState(false);

  const presentationIcons = {
    readAloud: Volume2,
    clearReading: Type,
    reducedMotion: Pause,
    largerText: ALargeSmall
  } as const;

  return (
    <div className={styles.settings}>
      <Link className={styles.back} href="/">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("back")}
      </Link>

      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>

      {/*
       * How to play comes before what is stored: it is the part a child is here to change,
       * and the part a teacher needs to find in the thirty seconds before a class starts.
       */}
      {/* Presentation choices change how content is presented, never the answer or progress. */}
      <section aria-labelledby="settings-presentation" className={styles.group}>
        <h2 className={styles.groupTitle} id="settings-presentation">
          {tModes("presentationTitle")}
        </h2>
        <p className={styles.groupLead}>{tModes("presentationLead")}</p>

        <ul className={styles.switchList}>
          {PRESENTATION_KEYS.map((key) => {
            const Icon = presentationIcons[key];
            const active = accessibility[key];
            const name = tModes(`${key}Name`);
            /* A voice this phone does not have would be a button that stays silent. */
            const unavailable = key === "readAloud" && active && !speech.available;

            return (
              <li key={key}>
                <button
                  aria-label={active ? tModes("turnOff", { mode: name }) : tModes("turnOn", { mode: name })}
                  aria-pressed={active}
                  className={`${styles.switch} ${active ? styles.switchOn : ""}`}
                  type="button"
                  onClick={() => togglePresentationSetting(key)}
                >
                  <span className={styles.rowIcon}>
                    <Icon aria-hidden="true" size={18} />
                  </span>
                  <span className={styles.presetText}>
                    <span className={styles.rowName}>{name}</span>
                    <span className={styles.rowDetail}>
                      {unavailable ? tModes("readAloudUnavailable") : tModes(`${key}Detail`)}
                    </span>
                  </span>
                  <span className={active ? styles.stateOn : styles.stateOff}>
                    {active && <Check aria-hidden="true" size={13} />}
                    {active ? tModes("on") : tModes("off")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className={styles.noPenalty}>{tModes("noPenalty")}</p>

        <div className={styles.why}>
          <h3 className={styles.whyTitle}>{tModes("whyTitle")}</h3>
          <p className={styles.whyBody}>{tModes("whyBody")}</p>
          <p className={styles.whyHonest}>{tModes("whyHonest")}</p>
        </div>
      </section>

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

    </div>
  );
}
