"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { usePrefersReducedMotion } from "@/features/accessibility/usePrefersReducedMotion";
import type { IslandStoryScene } from "@/features/onboarding/islandStory";
import styles from "./IslandStory.module.css";

const TYPEWRITER_INTERVAL_MS = 14;

/**
 * The arrival at an island, told rather than announced.
 *
 * Deliberately the same grammar as the game's opening - a full picture, a line typing
 * itself over it, a tap to go on - because a child who has already seen the opening should
 * recognise this as the same kind of moment rather than as a new screen to work out.
 *
 * The whole thing is one button. Anywhere you touch advances it, which is the only
 * interaction a six-year-old can be relied on to find, and the skip is the single exception
 * sitting where nobody presses by accident.
 */
export function IslandStory({
  islandKey,
  scenes,
  onComplete
}: {
  islandKey: string;
  scenes: readonly IslandStoryScene[];
  onComplete: () => void;
}) {
  const t = useTranslations("islandStory");
  const reducedMotion = usePrefersReducedMotion();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [beatIndex, setBeatIndex] = useState(0);

  const scene = scenes[sceneIndex];
  const isFinalBeat = sceneIndex === scenes.length - 1 && beatIndex === scene.beats.length - 1;
  const text = t(`${islandKey}.${scene.beats[beatIndex]}`);

  const advance = () => {
    if (isFinalBeat) {
      onComplete();
      return;
    }
    if (beatIndex < scene.beats.length - 1) {
      setBeatIndex((index) => index + 1);
      return;
    }
    setSceneIndex((index) => index + 1);
    setBeatIndex(0);
  };

  return (
    <button
      aria-label={t("aria", { current: sceneIndex + 1, total: scenes.length })}
      className={`${styles.story} app-chrome-hidden`}
      style={{ "--story-image": `url(${scene.image})` } as CSSProperties}
      type="button"
      onClick={advance}
    >
      <span aria-hidden="true" className={styles.visual} />
      <span aria-hidden="true" className={styles.veil} />

      <span
        className={styles.skip}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          onComplete();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          onComplete();
        }}
      >
        {t("skip")}
      </span>

      <StoryBeat
        key={`${scene.id}-${beatIndex}`}
        continueLabel={isFinalBeat ? t("finish") : t("continue")}
        reducedMotion={reducedMotion}
        text={text}
      />
    </button>
  );
}

/**
 * One line, typed out.
 *
 * The full text is in the DOM from the first frame and only its visible slice grows, so a
 * screen reader announces the sentence once and completely instead of stuttering it letter
 * by letter - and a child who prefers stillness gets it whole immediately.
 */
function StoryBeat({
  continueLabel,
  reducedMotion,
  text
}: {
  continueLabel: string;
  reducedMotion: boolean;
  text: string;
}) {
  const [shown, setShown] = useState(0);
  /* Turning stillness on mid-line finishes it rather than freezing it half written. */
  const done = reducedMotion || shown >= text.length;

  // Never reset here: the caller keys this component per beat, so each line gets a fresh
  // mount and starts from zero on its own.
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setShown((count) => {
        if (count >= text.length) {
          clearInterval(timer);
          return count;
        }
        return count + 1;
      });
    }, TYPEWRITER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reducedMotion, text.length]);

  return (
    <span className={styles.beat}>
      <span aria-hidden="true" className={styles.typed}>
        {reducedMotion ? text : text.slice(0, shown)}
      </span>
      <span className={styles.srOnly}>{text}</span>
      <span aria-hidden="true" className={`${styles.continue} ${done ? styles.continueReady : ""}`}>
        {continueLabel}
      </span>
    </span>
  );
}
