"use client";

import { Egg, Film, Search, ShieldCheck, Sparkles, Star, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { getAchievementDefinition, type AchievementIcon, type AchievementId } from "@/features/achievements/achievementModel";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import styles from "./BonusAchievementCelebration.module.css";

const AUTO_DISMISS_MS = 4500;
const EXIT_MS = 220;

const icons: Record<AchievementIcon, LucideIcon> = {
  star: Star,
  search: Search,
  detective: ShieldCheck,
  film: Film,
  egg: Egg
};

/** A non-blocking, one-time toast for every newly earned achievement. */
export function BonusAchievementCelebration({
  ids,
  onPresented,
  onDismissed
}: {
  ids: readonly AchievementId[];
  onPresented: (ids: readonly AchievementId[]) => void;
  onDismissed?: () => void;
}) {
  const t = useTranslations("achievements");
  const { reducedMotion } = useAccessibility();
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const presentedRef = useRef(false);
  const [visibleIds] = useState(() => [...ids]);

  const dismiss = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setVisible(false);
      onDismissed?.();
    }, reducedMotion ? 120 : EXIT_MS);
  }, [closing, onDismissed, reducedMotion]);

  useEffect(() => {
    const root = document.createElement("div");
    root.dataset.achievementToastPortal = "";
    document.body.append(root);
    const portalTimer = window.setTimeout(() => setPortalRoot(root), 0);
    return () => {
      clearTimeout(portalTimer);
      root.remove();
    };
  }, []);

  useEffect(() => {
    if (!portalRoot) return;
    if (!presentedRef.current) {
      presentedRef.current = true;
      onPresented(visibleIds);
    }
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismiss, onPresented, portalRoot, visibleIds]);

  if (!visible || !portalRoot) return null;

  return createPortal(
    <div className={styles.overlay}>
      <aside
        aria-atomic="true"
        aria-live="polite"
        className={`${styles.toast} ${closing ? styles.closing : ""} ${reducedMotion ? styles.still : ""}`}
        role="status"
      >
        <Sparkles aria-hidden="true" className={styles.sparkles} strokeWidth={2.4} />
        <div className={styles.copy}>
          <h2>{t(ids.length > 1 ? "twoUnlocked" : "newTitle")}</h2>
          <div className={styles.achievements}>
            {visibleIds.map((id) => {
              const definition = getAchievementDefinition(id);
              const Icon = icons[definition.icon];
              return (
                <p className={`${styles.achievement} ${definition.icon === "egg" ? styles.egg : ""}`} key={id}>
                  <Icon aria-hidden="true" className={styles.icon} strokeWidth={2.3} />
                  <strong>{t(`names.${definition.messageKey}`)}</strong>
                </p>
              );
            })}
          </div>
        </div>
        <button aria-label={t("dismiss")} className={styles.dismiss} onClick={dismiss} type="button">
          <X aria-hidden="true" size={20} strokeWidth={2.6} />
        </button>
      </aside>
    </div>,
    portalRoot
  );
}
