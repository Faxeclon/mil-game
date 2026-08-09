"use client";

import { useId, useState } from "react";
import { ChevronLeft, GraduationCap, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLocalPlayedOn } from "@/features/progress/streak";
import { registerTeacher, signOutTeacher, useTeacherAccount } from "@/features/teacher/teacherAccountStore";
import { Link, useRouter } from "@/i18n/navigation";
import styles from "./TeacherJoinClient.module.css";

/**
 * Where a teacher says this device is theirs.
 *
 * It is the only place in the whole project that asks for an email, and it asks an adult
 * for their own. Children are never asked for anything: in a classroom they hold printed
 * cards, and this screen is not part of their path at all.
 *
 * Nothing is sent. The address stays on this device until there is a server to hold it,
 * and the screen says so rather than implying a confirmation mail is on its way.
 */
export function TeacherJoinClient() {
  const t = useTranslations("teacherAccount");
  const emailFieldId = useId();
  const router = useRouter();
  const { hydrated, account } = useTeacherAccount();
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);

  if (!hydrated) {
    return <p className={styles.loading}>{t("lead")}</p>;
  }

  if (account) {
    return (
      <div className={styles.join}>
        <Link className={styles.back} href="/teacher">
          <ChevronLeft aria-hidden="true" size={18} />
          {t("navLabel")}
        </Link>

        <span className={styles.seal}>
          <GraduationCap aria-hidden="true" size={28} />
        </span>
        <h1 className={styles.title}>{t("navLabel")}</h1>
        <p className={styles.lead}>{t("registeredAs", { email: account.email })}</p>
        {account.syncPending && <p className={styles.notSent}>{t("notSent")}</p>}

        {/* No confirmation: leaving costs nothing. The card sets stay where they are,
            and registering again is one tap away. */}
        <button
          className={styles.secondary}
          type="button"
          onClick={() => {
            signOutTeacher();
            router.push("/");
          }}
        >
          <LogOut aria-hidden="true" size={16} />
          {t("signOut")}
        </button>
        <p className={styles.fieldHint}>{t("signOutKeepsCards")}</p>
      </div>
    );
  }

  return (
    <div className={styles.join}>
      <Link className={styles.back} href="/">
        <ChevronLeft aria-hidden="true" size={18} />
        {t("navLabel")}
      </Link>

      {/*
        One door for both cases. With no server there is nothing to check an address
        against, so entering and registering are the same act: the copy says that plainly
        instead of implying a password was verified somewhere.
      */}
      <h1 className={styles.title}>{t("signIn")}</h1>
      <p className={styles.lead}>{t("signInLead")}</p>
      {/* Said before the field, because it is the fear that stops an adult tapping this. */}
      <p className={styles.notSent}>{t("keepsChildProgress")}</p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const today = getLocalPlayedOn(new Date()) ?? "";
          if (registerTeacher(email, today)) {
            router.push("/");
            return;
          }
          setInvalid(true);
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

        <button className={styles.primary} type="submit">
          {t("submit")}
        </button>
      </form>

      <p className={styles.notSent}>{t("notSent")}</p>
    </div>
  );
}
