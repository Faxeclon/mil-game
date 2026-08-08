"use client";

import { useCallback, useEffect, useRef } from "react";
import { Square, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import { useSpeech } from "@/features/speech/useSpeech";
import { useBackgroundMusic } from "./BackgroundMusicProvider";
import styles from "./ListenButton.module.css";

type ListenButtonProps = {
  /** Everything that should be read, in the order a child would meet it on screen. */
  lines: Array<string | null | undefined>;
};

export function ListenButton({ lines }: ListenButtonProps) {
  const t = useTranslations("accessModes");
  const { readAloud } = useAccessibility();
  const { pauseForSpeech, resumeAfterSpeech } = useBackgroundMusic();
  const resumeMusicRef = useRef(false);
  const pauseMusic = useCallback(() => {
    resumeMusicRef.current = pauseForSpeech();
  }, [pauseForSpeech]);
  const resumeMusic = useCallback(() => {
    const shouldResume = resumeMusicRef.current;
    resumeMusicRef.current = false;
    resumeAfterSpeech(shouldResume);
  }, [resumeAfterSpeech]);
  const { available, speaking, speak, stop } = useSpeech({
    onSpeechStart: pauseMusic,
    onSpeechEnd: resumeMusic
  });

  const text = lines.filter((line): line is string => Boolean(line && line.trim())).join(". ");

  useEffect(() => {
    stop();
  }, [stop, text]);

  if (!readAloud || !available || !text) return null;

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
