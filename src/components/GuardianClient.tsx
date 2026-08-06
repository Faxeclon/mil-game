"use client";

import { useId, useState } from "react";
import { Check, ChevronLeft, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { consentPromiseKeys } from "@/features/guardian/guardianConsent";
import { getLocalPlayedOn } from "@/features/progress/streak";
import { useProgress } from "@/features/progress/ProgressProvider";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./GuardianClient.module.css";

/**
 * Linking a child to the responsible adult at home.
 *
 * The adult gives their own address and nothing else; the child is never asked for
 * anything, and nothing about them is added by linking. The promises are listed above
 * the button so the decision is made after reading them rather than before.
 *
 * Teachers have their own door on the start screen, so this page never asks which kind
 * of adult is reading it. The whole privacy claim of the project rests on this moment,
 * which is why it is built for real even though there is nowhere to sync to yet.
 */
export function GuardianClient() {
  const t = useTranslations("guardian");
  const emailFieldId = useId();
  const router = useRouter();
  const { hydrated, guardian, authorizeGuardian, withdrawGuardian } = useProgress();
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);

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
        <p className={styles.lead}>{t("grantedWho", { email: guardian.email })}</p>
        <p className={styles.meta}>{t("grantedOn", { date: guardian.authorizedOn })}</p>

        {/* Said plainly: the link exists, and still nothing has left the device. */}
        {guardian.syncPending && <p className={styles.pending}>{t("grantedPending")}</p>}

        {/* No confirmation: unlinking costs nothing, every medal stays. */}
        <button
          className={styles.secondary}
          type="button"
          onClick={() => {
            withdrawGuardian();
            router.push("/settings");
          }}
        >
          {t("withdraw")}
        </button>
        <p className={styles.meta}>{t("withdrawKeeps")}</p>
      </div>
    );
  }

  return (
    <div className={styles.guardian}>
      <Link className={styles.back} href="/settings">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("back")}
      </Link>

      <span className={styles.seal}>
        <ShieldCheck aria-hidden="true" size={26} />
      </span>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>

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

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const today = getLocalPlayedOn(new Date()) ?? "";
          if (!email.trim() || !today) {
            setInvalid(true);
            return;
          }
          authorizeGuardian(email, today);
          router.push("/settings");
        }}
      >
        <label className={styles.fieldLabel} htmlFor={emailFieldId}>
          {t("emailLabel")}
        </label>
        <input
          aria-describedby={`${emailFieldId}-hint${invalid ? ` ${emailFieldId}-error` : ""}`}
          autoComplete="email"
          className={styles.input}
          id={emailFieldId}
          inputMode="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setInvalid(false);
          }}
        />
        <p className={styles.fieldHint} id={`${emailFieldId}-hint`}>
          {t("emailHint")}
        </p>
        {invalid && (
          <p className={styles.fieldError} id={`${emailFieldId}-error`} role="alert">
            {t("emailInvalid")}
          </p>
        )}

        <button className={styles.accept} type="submit">
          <ShieldCheck aria-hidden="true" size={19} />
          {t("accept")}
        </button>
      </form>

      <Link className={styles.secondary} href="/settings">
        {t("cancel")}
      </Link>
    </div>
  );
}
