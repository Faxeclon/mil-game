"use client";

import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTeacherRouteAccess } from "@/features/teacher/teacherRouteAccess";
import { useTeacherAccount } from "@/features/teacher/teacherAccountStore";
import { Link } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";
import styles from "./ProfileRouteGuard.module.css";

/** Keeps local teacher-only tools off direct URLs without claiming server authentication. */
export function TeacherRouteGuard({ children }: { children: ReactNode }) {
  const t = useTranslations("teacherAccount");
  const { hydrated, account } = useTeacherAccount();
  const access = getTeacherRouteAccess(hydrated, account);

  if (access === "checking") {
    return <LoadingRoqui message={t("locked")} title={t("title")} />;
  }

  if (access === "denied") {
    return (
      <section aria-labelledby="teacher-route-guard-title" className={styles.guard}>
        <span className={styles.mark}>
          <GraduationCap aria-hidden="true" size={26} />
        </span>
        <h1 className={styles.title} id="teacher-route-guard-title">
          {t("title")}
        </h1>
        <p className={styles.text}>{t("locked")}</p>
        <Link className={styles.action} href="/teacher/join">
          {t("register")}
        </Link>
      </section>
    );
  }

  return <>{children}</>;
}
