import Image from "next/image";
import { Eye, HelpCircle, Play, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import styles from "./HomeLanding.module.css";

/**
 * Landing screen. The mascot asks the question the whole product answers, so a child
 * meets a character before reading anything. Copy is deliberately kept to one line.
 */
export async function HomeLanding() {
  const t = await getTranslations("home");

  const tools = [
    { icon: Eye, title: t("look") },
    { icon: HelpCircle, title: t("ask") },
    { icon: Search, title: t("check") }
  ];

  return (
    <div className={styles.landing}>
      <section aria-labelledby="home-title" className={styles.hero}>
        <div className={styles.mascotRow}>
          <p className={styles.bubble}>
            <span className={styles.greeting}>{t("greeting")}</span>
            <span className={styles.hook} id="home-title">
              {t("title")}
            </span>
            <span className={styles.promise}>{t("description")}</span>
          </p>
          <span className={styles.mascot}>
            <Image
              alt={t("mascotAlt")}
              height={320}
              priority
              src="/media/mascot/roqui.png"
              width={320}
            />
          </span>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/tutorial">
            <Play aria-hidden="true" size={18} fill="currentColor" />
            {t("start")}
          </Link>
          <Link className={styles.secondaryAction} href="/worlds">
            {t("viewMissions")}
          </Link>
        </div>
      </section>

      <ol aria-label={t("learningTitle")} className={styles.toolRow}>
        {tools.map(({ icon: Icon, title }) => (
          <li className={styles.tool} key={title}>
            <span aria-hidden="true" className={styles.toolIcon}>
              <Icon size={19} strokeWidth={2.3} />
            </span>
            {title}
          </li>
        ))}
      </ol>
    </div>
  );
}
