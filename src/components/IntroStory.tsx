"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
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
  const [readySceneImage, setReadySceneImage] = useState<string | null>(null);
  const [loadingNextScene, setLoadingNextScene] = useState(false);
  const loadedImages = useRef(new Set<string>());
  const scene = scenes[sceneIndex];
  const sceneReady = readySceneImage === scene.image;
  const text = t(scene.beats[beatIndex]);
  const isFinalBeat = sceneIndex === scenes.length - 1 && beatIndex === scene.beats.length - 1;

  useEffect(() => {
    let active = true;
    const image = new window.Image();
    const markReady = () => {
      if (!active) return;
      loadedImages.current.add(scene.image);
      setReadySceneImage(scene.image);
      setLoadingNextScene(false);
    };
    image.addEventListener("load", markReady, { once: true });
    image.addEventListener("error", markReady, { once: true });
    image.src = scene.image;
    return () => {
      active = false;
      image.removeEventListener("load", markReady);
      image.removeEventListener("error", markReady);
    };
  }, [scene.image]);

  const advance = () => {
    if (!sceneReady || loadingNextScene || isFinalBeat) return;
    if (beatIndex < scene.beats.length - 1) {
      setBeatIndex((index) => index + 1);
      return;
    }
    const nextScene = scenes[sceneIndex + 1];
    if (!nextScene) return;
    if (loadedImages.current.has(nextScene.image)) {
      setReadySceneImage(nextScene.image);
      setSceneIndex((index) => index + 1);
      setBeatIndex(0);
      return;
    }
    setLoadingNextScene(true);
    const image = new window.Image();
    const showNextScene = () => {
      loadedImages.current.add(nextScene.image);
      setReadySceneImage(nextScene.image);
      setSceneIndex((index) => index + 1);
      setBeatIndex(0);
    };
    image.addEventListener("load", showNextScene, { once: true });
    image.addEventListener("error", showNextScene, { once: true });
    image.src = nextScene.image;
  };

  const advanceFromStorySurface = (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest("button")) return;
    advance();
  };

  return (
    <main
      aria-label={t("aria", { current: sceneIndex + 1, total: scenes.length })}
      className={`${styles.story} app-chrome-hidden`}
      style={{ "--story-image": `url(${scene.image})` } as CSSProperties}
      onClick={advanceFromStorySurface}
    >
      <button className={styles.skip} type="button" onClick={(event) => { event.stopPropagation(); onComplete(); }}>
        {t("skip")}
      </button>
      {sceneReady && <div className={styles.visual} />}
      <div className={styles.topGradient} />
      <div className={styles.bottomGradient} />
      {sceneReady ? (
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
      ) : (
        <p className={styles.loading} role="status">{t("loading")}</p>
      )}
      {loadingNextScene && <div aria-hidden="true" className={styles.transition} />}
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

  const advance = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isFullyRevealed) {
      setVisibleCharacters(text.length);
      return;
    }
    if (!isFinalBeat) onAdvance();
  };

  return (
    <section aria-live="polite" className={styles.dialogue}>
      {isFinalBeat ? (
        <p className={styles.text}>{reducedMotion ? text : text.slice(0, visibleCharacters)}</p>
      ) : (
        <button aria-label={advanceAria} className={styles.dialogueAdvance} type="button" onClick={advance}>
          <span className={styles.text}>{reducedMotion ? text : text.slice(0, visibleCharacters)}</span>
          {isFullyRevealed && <span aria-hidden="true" className={styles.continueMark}>▼</span>}
        </button>
      )}
      {isFinalBeat && isFullyRevealed && (
        <button autoFocus className={styles.finish} type="button" onClick={(event) => { event.stopPropagation(); onComplete(); }}>
          {finish}
        </button>
      )}
    </section>
  );
}
