"use client";

import { useState } from "react";
import {
  Accessibility,
  Brain,
  Check,
  ChevronLeft,
  Smartphone,
  Sparkles,
  ShieldCheck,
  Trash2,
  Type,
  UserPlus,
  Users,
  Volume2,
  Wind
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { usePrefersReducedMotion } from "@/features/accessibility/usePrefersReducedMotion";
import { MAX_LOCAL_PROFILES } from "@/features/profiles/localProfiles";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";
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
  const tProfiles = useTranslations("profiles");
  const tGuardian = useTranslations("guardian");
  const {
    hydrated,
    resetProgress,
    completedLevelIds,
    guardian,
    profiles,
    addProfile,
    selectProfile,
    removeProfile,
    clearEverything
  } = useProgress();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingErase, setConfirmingErase] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const upcoming = [
    { key: "largerText", Icon: Type },
    { key: "sound", Icon: Volume2 },
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

      <section aria-labelledby="settings-active" className={styles.group}>
        <h2 className={styles.groupTitle} id="settings-active">
          {t("activeTitle")}
        </h2>

        <div className={styles.row}>
          <span className={styles.rowIcon}>
            <Wind aria-hidden="true" size={18} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowName}>{t("motionName")}</span>
            <span className={styles.rowDetail}>{t("motionDetail")}</span>
          </span>
          {/* Reported, not offered: the switch belongs to the device, and the game obeys it. */}
          <span className={prefersReducedMotion ? styles.stateOn : styles.stateOff}>
            {prefersReducedMotion ? (
              <>
                <Check aria-hidden="true" size={13} strokeWidth={3} />
                {t("motionOn")}
              </>
            ) : (
              t("motionOff")
            )}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.rowIcon}>
            <Accessibility aria-hidden="true" size={18} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowName}>{t("languageName")}</span>
            <span className={styles.rowDetail}>{t("languageDetail")}</span>
          </span>
          <LanguageSwitcher />
        </div>
      </section>

      <section aria-labelledby="settings-data" className={styles.group}>
        <h2 className={styles.groupTitle} id="settings-data">
          {t("dataTitle")}
        </h2>

        <div className={styles.row}>
          <span className={styles.rowIcon}>
            <Smartphone aria-hidden="true" size={18} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowName}>{tStorage("guestBadge")}</span>
            <span className={styles.rowDetail}>{tStorage("guestNotice")}</span>
          </span>
        </div>

        {/* The consent lives with the player it was given for, so it is managed here. */}
        <div className={styles.row}>
          <span className={styles.rowIcon}>
            <ShieldCheck aria-hidden="true" size={18} />
          </span>
          <span className={styles.rowText}>
            <span className={styles.rowName}>{tGuardian("manageTitle")}</span>
            <span className={styles.rowDetail}>
              {guardian
                ? tGuardian("grantedBy", {
                    role: tGuardian(guardian.role === "parent" ? "roleParentShort" : "roleTeacherShort")
                  })
                : tGuardian("manageGuest")}
            </span>
          </span>
          <Link className={styles.resetStart} href="/guardian">
            {guardian ? tGuardian("manageTitle") : tGuardian("askAdult")}
          </Link>
        </div>

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

      <section aria-labelledby="settings-players" className={styles.group}>
        <h2 className={styles.groupTitle} id="settings-players">
          {tProfiles("manageTitle")}
        </h2>
        <p className={styles.groupLead}>{tProfiles("manageLead")}</p>

        <ul className={styles.upcomingList}>
          {profiles.profiles.map((profile, index) => {
            const name = profile.progress.localNickname ?? tProfiles("unnamed", { number: index + 1 });
            const isActive = profile.id === profiles.activeId;

            return (
              <li className={styles.row} key={profile.id}>
                <span className={styles.rowIcon}>
                  <Users aria-hidden="true" size={18} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{name}</span>
                  <span className={styles.rowDetail}>
                    {tProfiles("playerMissions", { count: profile.progress.completedLevelIds.length })}
                  </span>
                </span>

                {isActive ? (
                  <span className={styles.stateOn}>
                    <Check aria-hidden="true" size={13} strokeWidth={3} />
                    {tProfiles("current")}
                  </span>
                ) : (
                  <button className={styles.resetStart} type="button" onClick={() => selectProfile(profile.id)}>
                    {tProfiles("switchTo")}
                  </button>
                )}

                {profiles.profiles.length > 1 &&
                  (removingId === profile.id ? (
                    <span className={styles.resetConfirm}>
                      <span className={styles.resetQuestion}>{tProfiles("removeConfirm", { name })}</span>
                      <button
                        className={styles.resetYes}
                        type="button"
                        onClick={() => {
                          removeProfile(profile.id);
                          setRemovingId(null);
                        }}
                      >
                        {tProfiles("removeYes")}
                      </button>
                      <button className={styles.resetNo} type="button" onClick={() => setRemovingId(null)}>
                        {tProfiles("removeNo")}
                      </button>
                    </span>
                  ) : (
                    <button
                      aria-label={tProfiles("removePlayer")}
                      className={styles.resetNo}
                      type="button"
                      onClick={() => setRemovingId(profile.id)}
                    >
                      <Trash2 aria-hidden="true" size={15} />
                    </button>
                  ))}
              </li>
            );
          })}
        </ul>

        {profiles.profiles.length < MAX_LOCAL_PROFILES ? (
          <button className={styles.resetStart} type="button" onClick={addProfile}>
            <UserPlus aria-hidden="true" size={15} />
            {tProfiles("addPlayer")}
          </button>
        ) : (
          <p className={styles.resetText}>{tProfiles("full", { max: MAX_LOCAL_PROFILES })}</p>
        )}

        <div className={styles.resetRow}>
          <p className={styles.resetText}>{tProfiles("eraseAllConfirm")}</p>
          {confirmingErase ? (
            <span className={styles.resetConfirm}>
              <button
                className={styles.resetYes}
                type="button"
                onClick={() => {
                  clearEverything();
                  setConfirmingErase(false);
                }}
              >
                <Trash2 aria-hidden="true" size={15} />
                {tProfiles("eraseAllYes")}
              </button>
              <button className={styles.resetNo} type="button" onClick={() => setConfirmingErase(false)}>
                {t("resetNo")}
              </button>
            </span>
          ) : (
            <button className={styles.resetNo} type="button" onClick={() => setConfirmingErase(true)}>
              {tProfiles("eraseAll")}
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
