"use client";

import { useRef, useState } from "react";
import {
  ALargeSmall,
  Brain,
  Check,
  ChevronLeft,
  GraduationCap,
  Pause,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Trash2,
  Type,
  Volume2,
  X
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ACCESSIBILITY_PRESET_KEYS,
  isCustom,
  isPresetActive,
  PRESENTATION_KEYS
} from "@/features/accessibility/accessibilitySettings";
import {
  resetAccessibility,
  toggleAccessibilityPreset,
  togglePresentationSetting,
  useAccessibility
} from "@/features/accessibility/accessibilityStore";
import { setSoundEnabled } from "@/features/audio/soundPreference";
import { Narrator } from "@/components/Narrator";
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
  const accessibility = useAccessibility();
  const speech = useSpeech();
  const switchesDialog = useRef<HTMLDialogElement>(null);
  const custom = isCustom(accessibility);

  const presetIcons = { ownPace: Brain, clearReading: Type } as const;

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

      {/* Read out too: a child who turned the voice on here should not have to read the
          screen that offers it. */}
      <Narrator lines={[t("title"), t("lead")]} />

      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>

      {/*
       * What is stored comes first: whose device this is and what can be erased from it.
       * How the game looks and sounds follows, because that is a preference rather than a
       * fact about the child, and losing it costs nothing.
       */}
      <DataSection />

      {/* Presentation choices change how content is presented, never the answer or progress. */}
      <section aria-labelledby="settings-presentation" className={styles.group}>
        <div className={styles.groupHead}>
          <h2 className={styles.groupTitle} id="settings-presentation">
            {tModes("presentationTitle")}
          </h2>
          {/*
           * Two cards cover almost everyone, so the four switches live behind this. A
           * child who knows what they need finds it in one tap; a child who does not is
           * never asked to work out which of four things applies to them.
           */}
          <button
            aria-label={tModes("customise")}
            className={`${styles.gear} ${custom ? styles.gearOn : ""}`}
            type="button"
            onClick={() => switchesDialog.current?.showModal()}
          >
            <Settings2 aria-hidden="true" size={18} />
            {/* The third state. Without it, a child who changed one switch sees two dark
                cards and nothing saying why. */}
            {custom && <span className={styles.gearLabel}>{tModes("custom")}</span>}
          </button>
        </div>
        <p className={styles.groupLead}>{tModes("presentationLead")}</p>

        <ul className={styles.presetList}>
          {ACCESSIBILITY_PRESET_KEYS.map((preset) => {
            const Icon = presetIcons[preset];
            const active = isPresetActive(accessibility, preset);
            const name = tModes(`${preset}PresetName`);

            return (
              <li key={preset}>
                <button
                  aria-label={active ? tModes("turnOff", { mode: name }) : tModes("turnOn", { mode: name })}
                  aria-pressed={active}
                  className={`${styles.preset} ${active ? styles.presetOn : ""}`}
                  type="button"
                  onClick={() => toggleAccessibilityPreset(preset)}
                >
                  <span className={styles.presetIcon}>
                    <Icon aria-hidden="true" size={20} />
                  </span>
                  <span className={styles.presetBody}>
                    <span className={styles.presetName}>{name}</span>
                    <span className={styles.presetDetail}>{tModes(`${preset}PresetDetail`)}</span>
                    {/* Who it was built for, said plainly, so nobody has to guess. */}
                    <span className={styles.presetFor}>{tModes(`${preset}PresetFor`)}</span>
                  </span>
                  <span className={styles.presetMark}>
                    <Check aria-hidden="true" size={13} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className={styles.noPenalty}>{tModes("noPenalty")}</p>
      </section>

      {/*
       * The four switches live in a dialog rather than on the page. Two cards cover almost
       * everyone, and a child who opens this screen should meet a choice, not an
       * inventory.
       */}
      <dialog aria-labelledby="settings-switches-title" className={styles.modal} ref={switchesDialog}>
        <div className={styles.modalInner}>
          <div className={styles.modalHead}>
            <h2 className={styles.modalTitle} id="settings-switches-title">
              {tModes("switchesTitle")}
            </h2>
            <button
              aria-label={tModes("close")}
              className={styles.modalClose}
              type="button"
              onClick={() => switchesDialog.current?.close()}
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
          <p className={styles.groupLead}>{tModes("switchesLead")}</p>

          <ul className={styles.switchList} id="settings-switches">
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

          <button
            className={styles.modalDone}
            type="button"
            onClick={() => switchesDialog.current?.close()}
          >
            {tModes("done")}
          </button>
        </div>
      </dialog>

      <ResetSection />

    </div>
  );
}

/**
 * Whose device this is, and what can be erased from it.
 *
 * Split out because the two destructive actions carry their own confirmation state, and
 * because it reads first on the screen: what is stored is a fact about this device, while
 * how the game looks is a preference that costs nothing to change.
 */
function DataSection() {
  const t = useTranslations("settings");
  const tStorage = useTranslations("storage");
  const tGuardian = useTranslations("guardian");
  const tTeacherAccount = useTranslations("teacherAccount");
  const router = useRouter();
  const { completedLevelIds, guardian } = useProgress();
  const { account: teacherAccount } = useTeacherAccount();
  /*
   * On a teacher's device there is no child playing, so the guest badge and the
   * grown-up's permission are answering a question nobody asked here.
   */
  const isTeacherDevice = teacherAccount !== null && completedLevelIds.length === 0;

  return (
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

    </section>
  );
}

/**
 * The two ways to start something over.
 *
 * Last on the screen on purpose. Everything above is a choice a child came here to make;
 * these two undo work, and nothing that erases medals should sit above the thing somebody
 * actually opened this page for.
 *
 * They sound alike and are not, so the wording, the icon and the weight of each button all
 * have to say which one throws work away.
 */
function ResetSection() {
  const t = useTranslations("settings");
  const { hydrated, resetProgress, completedLevelIds } = useProgress();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingSettingsReset, setConfirmingSettingsReset] = useState(false);

  return (
    <section aria-labelledby="settings-reset" className={styles.group}>
        <h2 className={styles.groupTitle} id="settings-reset">
          {t("resetTitle")}
        </h2>

        <div className={styles.resetRow}>
          <p className={styles.resetText}>
            <span className={styles.resetName}>{t("resetProgressName")}</span>
            <span className={styles.resetDetail}>{t("resetProgressDetail")}</span>
            <span className={styles.resetDetail}>
              {hydrated ? t("resetCount", { count: completedLevelIds.length }) : t("resetLoading")}
            </span>
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
              className={styles.resetDanger}
              disabled={!hydrated}
              type="button"
              onClick={() => setConfirmingReset(true)}
            >
              <Trash2 aria-hidden="true" size={15} />
              {t("resetProgressName")}
            </button>
          )}
        </div>

        <div className={styles.resetRow}>
          <p className={styles.resetText}>
            <span className={styles.resetName}>{t("resetSettingsName")}</span>
            <span className={styles.resetDetail}>{t("resetSettingsDetail")}</span>
          </p>
          {confirmingSettingsReset ? (
            <span className={styles.resetConfirm}>
              <span className={styles.resetSoftQuestion}>{t("resetSettingsConfirm")}</span>
              <button
                className={styles.resetStart}
                type="button"
                onClick={() => {
                  /*
                   * "Reset" may only put things back. The music has always started off, so
                   * switching it on here would be starting something nobody asked for —
                   * and unexpected sound is the last thing this screen should cause.
                   */
                  resetAccessibility();
                  setSoundEnabled(false);
                  setConfirmingSettingsReset(false);
                }}
              >
                <RotateCcw aria-hidden="true" size={15} />
                {t("resetSettingsYes")}
              </button>
              <button
                className={styles.resetNo}
                type="button"
                onClick={() => setConfirmingSettingsReset(false)}
              >
                {t("resetNo")}
              </button>
            </span>
          ) : (
            <button
              className={styles.resetStart}
              type="button"
              onClick={() => setConfirmingSettingsReset(true)}
            >
              <RotateCcw aria-hidden="true" size={15} />
              {t("resetSettingsName")}
            </button>
          )}
        </div>
    </section>
  );
}
