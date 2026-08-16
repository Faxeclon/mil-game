"use client";

import { ChevronLeft, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { applicationCredits } from "@/content/appCredits";
import { creditedPackPresentationKeys, getCreditedMedia } from "@/content/packs/packRegistry";
import { Link } from "@/i18n/navigation";
import styles from "./SettingsClient.module.css";

export function CreditsClient() {
  const t = useTranslations("credits");
  const applicationGroups = new Map<string, typeof applicationCredits>();
  for (const item of applicationCredits) applicationGroups.set(item.groupKey, [...(applicationGroups.get(item.groupKey) ?? []), item]);
  const groups = new Map<string, ReturnType<typeof getCreditedMedia>>();
  for (const item of getCreditedMedia()) groups.set(item.packId, [...(groups.get(item.packId) ?? []), item]);

  return (
    <div className={styles.settings}>
      <Link className={styles.back} href="/settings"><ChevronLeft aria-hidden="true" size={18} />{t("back")}</Link>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>
      {[...applicationGroups.entries()].map(([groupKey, items]) => (
        <section className={styles.group} key={groupKey}>
          <h2 className={styles.groupTitle}>{t(`groups.${groupKey}`)}</h2>
          <ul className={styles.creditList}>
            {items.map((credit) => (
              <li className={styles.credit} key={credit.id}>
                <strong>{t(`app.${credit.titleKey}`)}</strong>
                <span>{t(`app.${credit.descriptionKey}`, { tool: credit.tool.name })}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {[...groups.entries()].map(([packId, items]) => (
        <section className={styles.group} key={packId}>
          <h2 className={styles.groupTitle}>{t(`packs.${creditedPackPresentationKeys[packId as keyof typeof creditedPackPresentationKeys]}`)}</h2>
          <ul className={styles.creditList}>
            {items.map(({ media }) => {
              const credit = media.provenance.credit!;
              const sourceCredit = credit.basedOnImage ?? credit;
              return <li className={styles.credit} key={media.id}>
                {credit.creationMethod !== "ai-generated" && <strong>{credit.title ?? t("projectContent")}</strong>}
                {credit.creationMethod === "ai-generated" && <span>{t("projectGenerated")}</span>}
                {credit.basedOnImage
                  ? <span>{t("basedOnImage", { creator: credit.basedOnImage.creator, source: credit.basedOnImage.source })}</span>
                  : sourceCredit.creator && <span>{sourceCredit.creator}</span>}
                {sourceCredit.attributionText && <span>{sourceCredit.attributionText}</span>}
                {sourceCredit.source && <span>{sourceCredit.source}{sourceCredit.license && <> {"·"} {sourceCredit.license}</>}</span>}
                {credit.creationMethod === "project-created" && <span>{t("projectCreated")}</span>}
                {credit.modifications && <span>{credit.modifications}</span>}
                <span className={styles.creditLinks}>
                  {sourceCredit.sourceUrl && <a href={sourceCredit.sourceUrl} rel="noreferrer" target="_blank">{t("viewSource")} <ExternalLink aria-hidden="true" size={13} /></a>}
                  {sourceCredit.licenseUrl && <a href={sourceCredit.licenseUrl} rel="noreferrer" target="_blank">{t("viewLicense")} <ExternalLink aria-hidden="true" size={13} /></a>}
                </span>
              </li>;
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
