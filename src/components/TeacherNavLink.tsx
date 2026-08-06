"use client";

import { GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTeacherAccount } from "@/features/teacher/teacherAccountStore";
import { Link } from "@/i18n/navigation";

/**
 * The teacher entry, shown only on a device where a teacher registered.
 *
 * A child playing at home has no reason to meet a classroom menu, so it stays out of
 * their way entirely rather than appearing greyed out. It renders nothing until the
 * stored registration has been read, which also keeps the server markup identical for
 * everyone.
 */
export function TeacherNavLink({ className }: { className?: string }) {
  const t = useTranslations("teacherAccount");
  const { hydrated, account } = useTeacherAccount();

  if (!hydrated || !account) return null;

  return (
    <Link aria-label={t("navLabel")} className={className} href="/teacher">
      <GraduationCap aria-hidden="true" size={19} />
      <span>{t("navLabel")}</span>
    </Link>
  );
}
