"use client";

import { Square, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import { useSpeech } from "@/features/speech/useSpeech";
import styles from "./ListenButton.module.css";

type ListenButtonProps = {
  /** Everything that should be read, in the order a child would meet it on screen. */
  lines: Array<string | null | undefined>;
};

/**
 * The one control that reads the screen out loud.
 *
 * It appears only when the child asked for it *and* the phone can actually speak their
 * language. A button that stays silent when pressed would be worse than no button at all,
 * and in a game about telling real from fake it would be the wrong thing to ship.
 */
export function ListenButton({ lines }: ListenButtonProps) {
  const t = useTranslations("accessModes");
  const { readAloud } = useAccessibility();
  const { available, speaking, speak, stop } = useSpeech();

  if (!readAloud || !available) return null;

  const text = lines.filter((line): line is string => Boolean(line && line.trim())).join(". ");
  if (!text) return null;

  return (
    <button
      aria-label={speaking ? t("listenStop") : t("listen")}
      className={styles.listen}
      type="button"
      onClick={() => (speaking ? stop() : speak(text))}
    >
      {speaking ? <Square aria-hidden="true" size={15} /> : <Volume2 aria-hidden="true" size={17} />}
      <span className={styles.label}>{speaking ? t("listenStop") : t("listen")}</span>
    </button>
  );
}
