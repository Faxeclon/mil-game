"use client";

import { useState } from "react";
import { Check, ChevronLeft, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { consentPromiseKeys, type GuardianRole } from "@/features/guardian/guardianConsent";
import { getLocalPlayedOn } from "@/features/progress/streak";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link } from "@/i18n/navigation";
import styles from "./GuardianClient.module.css";

/**
 * Where a responsible adult says yes.
 *
 * One tap, no form. Nobody types an email, a name or a password, because none of that is
 * stored: what is recorded is a role and a date, the same pair the cloud schema keeps in
 * `adultos.autorizo_en`. The promises are listed above the buttons so the decision is
 * made after reading them rather than before.
 *
 * The whole privacy claim of the project rests on this moment, so it is built for real
 * even though there is nowhere to sync to yet. When the server arrives, this screen does
 * not change; only what happens to the record afterwards does.
 */
export function GuardianClient() {
  const t = useTranslations("guardian");
  const { hydrated, guardian, authorizeGuardian, withdrawGuardian } = useProgress();
  const [withdrawing, setWithdrawing] = useState(false);

  const roleLabel = (value: GuardianRole) => t(value === "parent" ? "roleParentShort" : "roleTeacherShort");

  if (!hydrated) {
    return <p className={styles.loading}>{t("lead")}</p>;
  }

  if (guardian) {
    return (
      <div className={styles.guardian}>
        <Link className={styles.back} href="/settings">
          <ChevronLeft aria-hidden="true" size={18} />
          {t("back")}
        </Link>

        <span className={styles.seal}>
          <ShieldCheck aria-hidden="true" size={28} />
        </span>
        <h1 className={styles.title}>{t("grantedTitle")}</h1>
        <p className={styles.lead}>{t("grantedBy", { role: roleLabel(guardian.role) })}</p>
        <p className={styles.meta}>{t("grantedOn", { date: guardian.authorizedOn })}</p>

        {/* Said plainly: consent has been given, and still nothing has left the device. */}
        {guardian.syncPending && <p className={styles.pending}>{t("grantedPending")}</p>}

        {withdrawing ? (
          <div className={styles.confirmRow}>
            <p className={styles.confirmText}>{t("withdrawConfirm")}</p>
            <button
              className={styles.danger}
              type="button"
              onClick={() => {
                withdrawGuardian();
                setWithdrawing(false);
              }}
            >
              {t("withdrawYes")}
            </button>
            <button className={styles.secondary} type="button" onClick={() => setWithdrawing(false)}>
              {t("withdrawNo")}
            </button>
          </div>
        ) : (
          <button className={styles.secondary} type="button" onClick={() => setWithdrawing(true)}>
            {t("withdraw")}
          </button>
        )}
      </div>
    );
  }

  const authorize = (role: GuardianRole) => {
    const today = getLocalPlayedOn(new Date());
    if (today) authorizeGuardian(role, today);
  };

  return (
    <div className={styles.guardian}>
      <Link className={styles.back} href="/settings">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("back")}
      </Link>

      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>

      {/* Read before the tap, not buried behind it. */}
      <section aria-labelledby="guardian-promises" className={styles.promises}>
        <h2 className={styles.promisesTitle} id="guardian-promises">
          {t("promisesTitle")}
        </h2>
        <ul className={styles.promiseList}>
          {consentPromiseKeys.map((key) => (
            <li className={styles.promise} key={key}>
              <Check aria-hidden="true" size={15} strokeWidth={3} />
              {t(`promises.${key}`)}
            </li>
          ))}
        </ul>
      </section>

      <p className={styles.rolesLegend}>{t("roleTitle")}</p>
      <div className={styles.roles}>
        {(["parent", "teacher"] as const).map((option) => {
          const Icon = option === "parent" ? Users : GraduationCap;

          return (
            <button className={styles.role} key={option} type="button" onClick={() => authorize(option)}>
              <Icon aria-hidden="true" size={19} />
              {t(`roles.${option}`)}
            </button>
          );
        })}
      </div>

      <Link className={styles.secondary} href="/settings">
        {t("cancel")}
      </Link>
    </div>
  );
}
