"use client";

import { Medal, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import styles from "./LocalMedalToast.module.css";

const AUTO_DISMISS_MS = 4500;
const EXIT_MS = 220;

/** A one-time local-storage confirmation, intentionally separate from earned achievements. */
export function LocalMedalToast({ onPresented }: { onPresented: () => void }) {
  const t = useTranslations("storage");
  const { reducedMotion } = useAccessibility();
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const presentedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => setVisible(false), reducedMotion ? 120 : EXIT_MS);
  }, [closing, reducedMotion]);

  useEffect(() => {
    const root = document.createElement("div");
    root.dataset.localMedalToastPortal = "";
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
      onPresented();
    }
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismiss, onPresented, portalRoot]);

  if (!visible || !portalRoot) return null;

  return createPortal(
    <div className={styles.overlay}>
      <aside aria-atomic="true" aria-live="polite" className={`${styles.toast} ${closing ? styles.closing : ""} ${reducedMotion ? styles.still : ""}`} role="status">
        <Medal aria-hidden="true" className={styles.medal} strokeWidth={2.4} />
        <div className={styles.copy}>
          <h2>{t("medalSavedTitle")}</h2>
          <p>{t("medalSavedDescription")}</p>
        </div>
        <button aria-label={t("dismiss") } className={styles.dismiss} onClick={dismiss} type="button">
          <X aria-hidden="true" size={20} strokeWidth={2.6} />
        </button>
      </aside>
    </div>,
    portalRoot
  );
}
