"use client";

import { useId, useState } from "react";
import { ChevronLeft, GraduationCap, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AdultRole } from "@/features/adults/adultAccount";
import { registerAdult, signIn, useAdultAccount } from "@/features/adults/adultAccountStore";
import { getLocalPlayedOn } from "@/features/progress/streak";
import { Link, useRouter } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
import styles from "./AdultJoinClient.module.css";

/**
 * The one door a grown-up walks through, in the two states it really has.
 *
 * Signing in asks for an address and nothing else: the device already knows the role of
 * everybody it has met, so asking again would be asking a question we can answer
 * ourselves. Registering is the only moment the role is a genuine question, because it is
 * the only moment nobody knows it yet.
 *
 * A parent and a teacher are doing the same thing here - saying this device is theirs -
 * and the only difference is what they came for. Two separate doors made that look like
 * two different acts, and left an adult who tapped the wrong one with no way across.
 */
export function AdultJoinClient() {
  const t = useTranslations("adult");
  const tCards = useTranslations("cards");
  const emailFieldId = useId();
  const router = useRouter();
  const { hydrated, account, adults } = useAdultAccount();

  // A device that has met somebody opens on the short form; a new one has nothing to
  // sign in against, so it opens on the only door that can work.
  const [registering, setRegistering] = useState<boolean | null>(null);
  const [role, setRole] = useState<AdultRole>("family");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<"invalid" | "newHere" | null>(null);

  if (!hydrated) return <LoadingRoqui message={t("signIn")} title={t("title")} />;

  // Somebody is already signed in; their own tools are the only sensible answer.
  if (account) {
    router.replace(account.role === "teacher" ? "/teacher" : "/adult");
    return <LoadingRoqui message={t("signIn")} title={t("title")} />;
  }

  const isRegistering = registering ?? adults.accounts.length === 0;
  const enter = (path: string) => router.push(path);

  const roles: { key: AdultRole; Icon: typeof Users }[] = [
    { key: "family", Icon: Users },
    { key: "teacher", Icon: GraduationCap }
  ];

  return (
    <div className={styles.join}>
      <Link className={styles.back} href="/">
        <ChevronLeft aria-hidden="true" size={18} />
        {tCards("back")}
      </Link>

      <h1 className={styles.title}>{isRegistering ? t("registerTitle") : t("signIn")}</h1>
      <p className={styles.lead}>{isRegistering ? t("registerLead") : t("signInLead")}</p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (isRegistering) {
            const today = getLocalPlayedOn(new Date()) ?? "";
            if (registerAdult(email, role, today)) {
              enter(role === "teacher" ? "/teacher" : "/adult");
              return;
            }
            setError("invalid");
            return;
          }
          if (signIn(email)) {
            // The role came back with the account, so where to go is already known.
            enter("/adult/join");
            return;
          }
          if (!email.trim()) {
            setError("invalid");
            return;
          }
          /*
           * An address this device has never seen is not a mistake to scold: it is
           * somebody who has not registered yet. They are moved to the only door that can
           * work, with what they typed already in the field, so the one thing still
           * missing is the single question nobody else can answer - which kind they are.
           */
          setRegistering(true);
          setError("newHere");
        }}
      >
        {/* The role is asked once, when nobody could know it. Never again. */}
        {isRegistering && (
          <fieldset className={styles.roles}>
            <legend className={styles.fieldLabel}>{t("roleLabel")}</legend>
            {roles.map(({ key, Icon }) => (
              <button
                aria-pressed={role === key}
                className={role === key ? styles.roleOn : styles.role}
                key={key}
                type="button"
                onClick={() => setRole(key)}
              >
                <Icon aria-hidden="true" size={20} />
                <span className={styles.roleName}>{t(`role.${key}`)}</span>
                <span className={styles.roleDetail}>{t(`roleDetail.${key}`)}</span>
              </button>
            ))}
          </fieldset>
        )}

        <label className={styles.fieldLabel} htmlFor={emailFieldId}>
          {t("emailLabel")}
        </label>
        <input
          aria-describedby={`${emailFieldId}-hint${error ? ` ${emailFieldId}-error` : ""}`}
          autoComplete="email"
          className={styles.input}
          id={emailFieldId}
          inputMode="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
        />
        <p className={styles.hint} id={`${emailFieldId}-hint`}>
          {t("emailHint")}
        </p>
        {error && (
          <p
            className={error === "newHere" ? styles.notice : styles.error}
            id={`${emailFieldId}-error`}
            role={error === "newHere" ? "status" : "alert"}
          >
            {error === "newHere" ? t("newHere") : t("emailInvalid")}
          </p>
        )}

        <button className={styles.primary} type="submit">
          {isRegistering ? t("continueAs", { role: t(`role.${role}`) }) : t("signIn")}
        </button>
      </form>

      {/* The other door, always reachable, because guessing wrong should cost one tap. */}
      <button
        className={styles.switchMode}
        type="button"
        onClick={() => {
          setRegistering(!isRegistering);
          setError(null);
        }}
      >
        {isRegistering ? t("haveAccount") : t("noAccount")}
      </button>

      <p className={styles.notSent}>{t("keepsChildProgress")}</p>
    </div>
  );
}
