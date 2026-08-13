"use client";

import { ChevronLeft, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { getCreditedMedia } from "@/content/packs/packRegistry";
import { Link } from "@/i18n/navigation";
import styles from "./SettingsClient.module.css";

export function CreditsClient() {
  const t = useTranslations("credits");
  const tIslands = useTranslations("islands");
  const groups = new Map<string, ReturnType<typeof getCreditedMedia>>();
  for (const item of getCreditedMedia()) groups.set(item.packId, [...(groups.get(item.packId) ?? []), item]);

  return (
    <div className={styles.settings}>
      <Link className={styles.back} href="/settings"><ChevronLeft aria-hidden="true" size={18} />{t("back")}</Link>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.lead}>{t("lead")}</p>
      {[...groups.entries()].map(([packId, items]) => (
        <section className={styles.group} key={packId}>
          <h2 className={styles.groupTitle}>{packId === "introductory-tutorial-v1" ? tIslands("list.training.title") : packId}</h2>
          <ul className={styles.creditList}>
            {items.map(({ media }) => {
              const credit = media.provenance.credit!;
              return <li className={styles.credit} key={media.id}>
                <strong>{credit.title ?? t("projectContent")}</strong>
                {credit.creator && <span>{credit.creator}</span>}
                {credit.source && <span>{credit.source}{credit.license ? ` · ${credit.license}` : ""}</span>}
                {credit.creationMethod === "ai-generated" && <span>{t("projectGenerated")}</span>}
                {credit.creationMethod === "project-created" && <span>{t("projectCreated")}</span>}
                {credit.modifications && <span>{credit.modifications}</span>}
                <span className={styles.creditLinks}>
                  {credit.sourceUrl && <a href={credit.sourceUrl} rel="noreferrer" target="_blank">{t("viewSource")} <ExternalLink aria-hidden="true" size={13} /></a>}
                  {credit.licenseUrl && <a href={credit.licenseUrl} rel="noreferrer" target="_blank">{t("viewLicense")} <ExternalLink aria-hidden="true" size={13} /></a>}
                </span>
              </li>;
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
