"use client";

import { Egg, Film, Search, ShieldCheck, Star, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { getAchievementDefinition, type AchievementIcon, type AchievementId } from "@/features/achievements/achievementModel";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import styles from "./BonusAchievementCelebration.module.css";

const icons: Record<AchievementIcon, LucideIcon> = {
  star: Star,
  search: Search,
  detective: ShieldCheck,
  film: Film,
  egg: Egg
};

/** One overlay groups every achievement from a completed run, including Eggspert. */
export function BonusAchievementCelebration({ ids, onContinue }: { ids: readonly AchievementId[]; onContinue: () => void }) {
  const t = useTranslations("achievements");
  const { reducedMotion } = useAccessibility();
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => continueRef.current?.focus(), []);

  return (
    <div className={styles.overlay}>
      <section
        aria-describedby="achievement-description"
        aria-labelledby="achievement-title"
        aria-modal="true"
        className={`${styles.dialog} ${reducedMotion ? styles.still : ""}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onContinue();
          }
          if (event.key === "Tab") event.preventDefault();
        }}
        role="dialog"
      >
        <span aria-hidden="true" className={styles.confetti}>{"✦ ✧ ✦"}</span>
        <h2 id="achievement-title">{t("newTitle")}</h2>
        <p id="achievement-description">{t(ids.length > 1 ? "twoUnlocked" : "oneUnlocked")}</p>
        <div className={styles.achievements}>
          {ids.map((id) => {
            const definition = getAchievementDefinition(id);
            const Icon = icons[definition.icon];
            return (
              <article className={`${styles.achievement} ${definition.icon === "egg" ? styles.egg : ""}`} key={id}>
                <Icon aria-hidden="true" className={styles.icon} strokeWidth={2.3} />
                <strong>{t(`names.${definition.messageKey}`)}</strong>
              </article>
            );
          })}
        </div>
        <button className={styles.continue} onClick={onContinue} ref={continueRef} type="button">
          {t("continue")}
        </button>
      </section>
    </div>
  );
}
