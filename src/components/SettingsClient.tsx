"use client";

import { useState } from "react";
import { Accessibility, Brain, Check, ChevronLeft, Smartphone, Sparkles, Trash2, Type, Volume2, Wind } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { usePrefersReducedMotion } from "@/features/accessibility/usePrefersReducedMotion";
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
  const { hydrated, resetProgress, completedLevelIds } = useProgress();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [confirmingReset, setConfirmingReset] = useState(false);

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
