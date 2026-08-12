"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "@/features/accessibility/usePrefersReducedMotion";
import { getIntroStoryScenes, type IntroStoryLocale } from "@/features/onboarding/introStory";
import styles from "./IntroStory.module.css";

const TYPEWRITER_INTERVAL_MS = 14;

export function IntroStory({ onComplete }: { onComplete: () => void }) {
  const t = useTranslations("introStory");
  const locale = useLocale() as IntroStoryLocale;
  const reducedMotion = usePrefersReducedMotion();
  const scenes = getIntroStoryScenes(locale === "en" ? "en" : "es");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [beatIndex, setBeatIndex] = useState(0);
  const scene = scenes[sceneIndex];
  const text = t(scene.beats[beatIndex]);
  const isFinalBeat = sceneIndex === scenes.length - 1 && beatIndex === scene.beats.length - 1;

  const advance = () => {
    if (beatIndex < scene.beats.length - 1) {
      setBeatIndex((index) => index + 1);
      return;
    }
    setSceneIndex((index) => index + 1);
    setBeatIndex(0);
  };

  return (
    <main
      aria-label={t("aria", { current: sceneIndex + 1, total: scenes.length })}
      className={`${styles.story} app-chrome-hidden`}
      style={{ "--story-image": `url(${scene.image})` } as CSSProperties}
    >
      <button className={styles.skip} type="button" onClick={onComplete}>
        {t("skip")}
      </button>
      <div className={styles.visual} />
      <div className={styles.topGradient} />
      <div className={styles.bottomGradient} />
      <StoryBeat
        key={`${scene.id}-${beatIndex}`}
        advanceAria={t("advanceAria", { current: sceneIndex + 1, total: scenes.length })}
        finish={t("finish")}
        isFinalBeat={isFinalBeat}
        reducedMotion={reducedMotion}
        text={text}
        onAdvance={advance}
        onComplete={onComplete}
      />
    </main>
  );
}

function StoryBeat({
  advanceAria,
  finish,
  isFinalBeat,
  reducedMotion,
  text,
  onAdvance,
  onComplete
}: {
  advanceAria: string;
  finish: string;
  isFinalBeat: boolean;
  reducedMotion: boolean;
  text: string;
  onAdvance: () => void;
  onComplete: () => void;
}) {
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const isFullyRevealed = reducedMotion || visibleCharacters >= text.length;

  useEffect(() => {
    if (reducedMotion || isFullyRevealed) return;
    const timeout = window.setTimeout(() => setVisibleCharacters((count) => count + 1), TYPEWRITER_INTERVAL_MS);
    return () => window.clearTimeout(timeout);
  }, [isFullyRevealed, reducedMotion, text.length, visibleCharacters]);

  const advance = () => {
    if (!isFullyRevealed) {
      setVisibleCharacters(text.length);
      return;
    }
    if (!isFinalBeat) onAdvance();
  };

  return (
    <section aria-live="polite" className={styles.dialogue}>
      <button
        aria-label={advanceAria}
        className={styles.dialogueAdvance}
        disabled={isFinalBeat && isFullyRevealed}
        type="button"
        onClick={advance}
      >
        <span className={styles.text}>{reducedMotion ? text : text.slice(0, visibleCharacters)}</span>
        {!isFinalBeat && isFullyRevealed && <span aria-hidden="true" className={styles.continueMark}>▼</span>}
      </button>
      {isFinalBeat && isFullyRevealed && (
        <button autoFocus className={styles.finish} type="button" onClick={onComplete}>
          {finish}
        </button>
      )}
    </section>
  );
}
