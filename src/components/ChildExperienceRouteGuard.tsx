"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { getAdultHome } from "@/features/adults/adultAccount";
import { useAdultAccount } from "@/features/adults/adultAccountStore";
import { getChildExperienceRouteAccess } from "@/features/adults/childExperienceRouteAccess";
import { useRouter } from "@/i18n/navigation";
import { LoadingRoqui } from "./LoadingRoqui";

/**
 * Keeps child gameplay off direct URLs while a grown-up is using this device.
 *
 * This deliberately sits outside profile, map-story, mission and Rush guards so none
 * of their child-facing UI can render before the adult session is known.
 */
export function ChildExperienceRouteGuard({ children }: { children: ReactNode }) {
  const t = useTranslations("locked");
  const router = useRouter();
  const { hydrated, account } = useAdultAccount();
  const access = getChildExperienceRouteAccess(hydrated, account);
  const adultHome = getAdultHome(account);

  useEffect(() => {
    if (access === "redirect" && adultHome) router.replace(adultHome);
  }, [access, adultHome, router]);

  if (access !== "allowed") return <LoadingRoqui message={t("checking")} title={t("title")} />;

  return <>{children}</>;
}
