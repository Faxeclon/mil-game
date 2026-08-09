"use client";

import { GraduationCap, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useHasMounted } from "@/features/app/useHasMounted";
import { getAdultHome } from "@/features/adults/adultAccount";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { Link } from "@/i18n/navigation";

/**
 * The grown-up's own tools, shown on a device where a grown-up signed in.
 *
 * It used to appear only for teachers, which left a parent signed in with no way to reach
 * their children from anywhere but the address bar. Both roles are the same act - an adult
 * saying this device is theirs - so both get the door, and the role only decides where it
 * leads.
 *
 * A child playing at home never meets it, and it renders nothing until the stored
 * registration has been read, so the server markup stays identical for everyone.
 */
export function AdultNavLink({ className }: { className?: string }) {
  const t = useTranslations("adult");
  const tTeacher = useTranslations("teacherAccount");
  const hasMounted = useHasMounted();
  const { hydrated, account } = useAdultAccount();

  const home = getAdultHome(account);
  if (!hasMounted || !hydrated || !account || !home) return null;

  const teaching = account.role === "teacher";
  const Icon = teaching ? GraduationCap : Users;

  return (
    <Link aria-label={teaching ? tTeacher("navLabel") : t("title")} className={className} href={home}>
      <Icon aria-hidden="true" size={19} />
      <span>{t(`role.${account.role}`)}</span>
    </Link>
  );
}
