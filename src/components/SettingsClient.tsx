"use client";

import { useRef, useState } from "react";
import {
  ALargeSmall,
  Brain,
  Check,
  ChevronLeft,
  GraduationCap,
  Pause,
  LogOut,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Smartphone,
  BookOpen,
  Trash2,
  Type,
  Users,
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
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { signOutAdultSession } from "@/features/adults/signOutAdultSession";
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

      <LeaveProfileButton />
    </div>
  );
}

/**
 * Handing the phone to somebody else. Last on the page, because it is the one action that
 * ends the session rather than adjusting it.
 *
 * Erasing progress keeps the player; this lets the player go. Without it, a second child
 * on a shared phone could only make room by wiping the first one's medals and then
 * playing under their name.
 */
function LeaveProfileButton() {
  const t = useTranslations("settings");
  const tAdult = useTranslations("adult");
  const router = useRouter();
  const { onboarded, progressState, leaveProfile } = useProgress();
  const { account } = useAdultAccount();
  const [confirming, setConfirming] = useState(false);

  /*
   * One way out, and it ends the session that is on top.
   *
   * A signed-in grown-up gets theirs first, whatever else is on the device. Asking whether
   * a child's profile happened to be open before they signed in would make signing out
   * depend on how they arrived - so somebody who signed in from a guest game found only
   * "leave this profile", pressed it, and was handed their own tools again by a device
   * that had never let them out.
   *
   * Their game goes with them; a child's does not, and once the session on top is closed
   * the child's own way out is the one offered here.
   */
  const childPlaying = onboarded && progressState.adultEmail === null;
  const leaving = account
    ? {
        label: tAdult(`signOutAs.${account.role}`),
        question: tAdult(`signOutConfirm.${account.role}`),
        yes: t("leaveProfileYes"),
        act: () => {
          signOutAdultSession();
          /*
           * Where the phone actually is once they are gone: a child still playing on it
           * gets their own game back, and an empty device gets the door in.
           */
          router.push(childPlaying ? "/" : "/adult/join");
        }
      }
    : onboarded
      ? {
          label: t("leaveProfile"),
          question: t("leaveProfileConfirm"),
          yes: t("leaveProfileYes"),
          act: () => {
            leaveProfile();
            router.push("/");
          }
        }
      : null;

  if (!leaving) return null;

  return (
    <div className={styles.leaveRow}>
      <button className={styles.leaveButton} type="button" onClick={() => setConfirming(true)}>
        <LogOut aria-hidden="true" size={16} />
        {leaving.label}
      </button>

      {/* Asked over the page rather than inside it: a question that only appears once the
          button is pressed should not reserve room on the screen beforehand. */}
      {confirming && (
        <div
          aria-label={leaving.question}
          aria-modal="true"
          className={styles.confirmOverlay}
          role="dialog"
          onClick={() => setConfirming(false)}
        >
          <div className={styles.confirmSheet} onClick={(event) => event.stopPropagation()}>
            <p className={styles.confirmQuestion}>{leaving.question}</p>
            <div className={styles.confirmActions}>
              <button className={styles.resetYes} type="button" onClick={leaving.act}>
                {leaving.yes}
              </button>
              <button className={styles.resetNo} type="button" onClick={() => setConfirming(false)}>
                {t("resetNo")}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const tAdult = useTranslations("adult");
  const { onboarded, guardian, progressState } = useProgress();
  const { account } = useAdultAccount();
  const teaching = account?.role === "teacher";
  /*
   * Whether a child is playing here, which is a different question from whether anybody
   * is. A grown-up's own game is a profile too, and telling them a local profile is
   * active - or offering to have a responsible adult authorise them - is the screen
   * talking to them as if they were the child they signed in to look after.
   */
  const childPlaying = onboarded && progressState.adultEmail === null;
  const needsGuardian = childPlaying && !guardian;

  return (
    <>
      <section aria-labelledby="settings-data" className={styles.group}>
        <h2 className={styles.groupTitle} id="settings-data">
          {t("dataTitle")}
        </h2>

        {/*
          Who is signed in on this device: a fact, so it is read here rather than acted on.
          The way out is the single button at the foot of the page, where the child's is
          too - two exits on one screen read as two different acts when there is only one.
        */}
        {account && (
          <div className={styles.row}>
            <span className={styles.rowIcon}>
              {teaching ? (
                <GraduationCap aria-hidden="true" size={18} />
              ) : (
                <Users aria-hidden="true" size={18} />
              )}
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowName}>
                {teaching ? tTeacherAccount("navLabel") : tAdult("title")}
              </span>
              <span className={styles.rowDetail}>{account.email}</span>
            </span>
          </div>
        )}

        {/* Where the child's own game is kept, said once, where a child is playing. */}
        {childPlaying && (
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

        {/*
          The consent lives with the player it was given for, so it is managed here. Once
          an adult is linked it earns a full row, because then there is something to read.
        */}
        {guardian && (
          <div className={styles.row}>
            <span className={styles.rowIcon}>
              <ShieldCheck aria-hidden="true" size={18} />
            </span>
            <span className={styles.rowText}>
              <span className={styles.rowName}>{tGuardian("manageTitle")}</span>
              <span className={styles.rowDetail}>{tGuardian("manageGranted")}</span>
            </span>
            <Link className={styles.resetStart} href="/guardian">
              {tGuardian("manageTitle")}
            </Link>
          </div>
        )}
      </section>

      <section className={styles.group}>
        <Link className={styles.teacherEntry} href="/settings/credits">
          <BookOpen aria-hidden="true" size={17} />
          {t("credits")}
        </Link>
      </section>

      {/*
        The doors that are still worth offering, and only those.
        A grown-up already signed in has their address in the row above and their tools in
        the navigation, so repeating them here would be a third way to the same place -
        which reads as three different things rather than one.
      */}
      {(!account || needsGuardian) && (
        <section aria-labelledby="settings-adults" className={styles.group}>
          <h2 className={styles.groupTitle} id="settings-adults">
            {t("adultsTitle")}
          </h2>
          <p className={styles.groupLead}>{t("adultsLead")}</p>

          <div className={styles.adultDoors}>
            {/*
              One door, whichever kind of grown-up walks through it. Two separate buttons
              made "family" and "teacher" look like different acts, when they are the same
              person saying this device is theirs and differing only in what they came for.
            */}
            {!account && (
              <Link className={styles.teacherEntry} href="/adult/join">
                <GraduationCap aria-hidden="true" size={17} />
                {tAdult("signIn")}
              </Link>
            )}
            {needsGuardian && (
              <Link className={styles.teacherEntry} href="/guardian">
                <ShieldCheck aria-hidden="true" size={17} />
                {tGuardian("askAdult")}
              </Link>
            )}
          </div>
        </section>
      )}
    </>
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
