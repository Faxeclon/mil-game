"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { getClipUrl, hasClip, parseClipManifest, type ClipManifest } from "./clipCatalog";
import { useSpeech } from "./useSpeech";

/**
 * Says a line, with the recorded voice where there is one.
 *
 * Two ways of speaking behind one call. A generated clip sounds like a person and is the
 * same on every phone; the device synthesiser sounds like a machine but exists everywhere
 * and can say anything, including a child's own nickname. Lines that were recorded use the
 * first, lines that were not use the second, and nothing in the app has to know which.
 *
 * `available` stays true if either one can speak, so a phone with no Spanish voice
 * installed still narrates whatever was recorded.
 */
export type Narration = {
  available: boolean;
  /**
   * Reads the lines one after another.
   *
   * Line by line rather than as one block, and that is the point of the whole module: a
   * screen mixes wording that never changes with wording that does, and only the first
   * kind can be recorded. Joining them would give the pair a single name that no recording
   * could ever match, so every screen would be back to the synthesiser.
   */
  say: (lines: string[]) => void;
  stop: () => void;
};

type NarrationCallbacks = { onStart?: () => void; onEnd?: () => void };

let manifestPromise: Promise<ClipManifest> | null = null;

/**
 * Fetched once per session and shared, so twenty narrators on twenty screens ask the
 * network at most once. A failure means no recordings, never no narration.
 */
function loadManifest(): Promise<ClipManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/audio/voice/manifest.json")
      .then((response) => (response.ok ? response.json() : null))
      .then(parseClipManifest)
      .catch(() => ({}));
  }
  return manifestPromise;
}

/** Test helper: forgets the shared manifest so each case starts from nothing. */
export function resetClipManifestForTests(): void {
  manifestPromise = null;
}

export function useNarration({ onStart, onEnd }: NarrationCallbacks = {}): Narration {
  const locale = useLocale();
  const [manifest, setManifest] = useState<ClipManifest | null>(null);
  const clipRef = useRef<HTMLAudioElement | null>(null);
  /*
   * The music is ducked once per reading rather than once per line: handing the ducking to
   * the synthesiser would let the volume bounce back up in the gap between two sentences.
   *
   * Pulled apart rather than kept as one object, and that matters more than it looks. A
   * hook returns a fresh object every render, so depending on the whole thing made `say`
   * change identity constantly, which re-ran the effect that calls it, which spoke again,
   * which set state, which rendered - and the greeting repeated for as long as anyone
   * watched. These two functions are stable; the object around them never was.
   */
  const { available: canSynthesise, speak: speakLine, stop: stopSpeech } = useSpeech();

  const callbacks = useRef({ onStart, onEnd });
  useEffect(() => {
    callbacks.current = { onStart, onEnd };
  }, [onEnd, onStart]);

  /*
   * Held in a ref as well as in state, and the ref is what `say` reads.
   *
   * The catalogue arrives a moment after the first screen does. If `say` depended on it,
   * that arrival would change the function, re-run the effect that calls it, and read the
   * greeting a second time. The ref lets the recordings become available without anything
   * being said twice; the state exists only so `available` can turn true.
   */
  const manifestRef = useRef<ClipManifest | null>(null);

  useEffect(() => {
    let mounted = true;
    void loadManifest().then((loaded) => {
      manifestRef.current = loaded;
      if (mounted) setManifest(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const stopClip = useCallback(() => {
    const clip = clipRef.current;
    if (!clip) return;
    clipRef.current = null;
    clip.pause();
    clip.onended = null;
    clip.onerror = null;
  }, []);

  /*
   * Every reading gets a number. A screen that changes while a line is still playing must
   * not have the old sequence carry on behind the new one, and comparing this is how each
   * callback knows whether it still speaks for what is on screen.
   */
  const runIdRef = useRef(0);
  const speakingRef = useRef(false);

  const endRun = useCallback(() => {
    if (!speakingRef.current) return;
    speakingRef.current = false;
    callbacks.current.onEnd?.();
  }, []);

  const stop = useCallback(() => {
    runIdRef.current += 1;
    stopClip();
    stopSpeech();
    endRun();
  }, [endRun, stopSpeech, stopClip]);

  const say = useCallback(
    (lines: string[]) => {
      stop();

      const spoken = lines.map((line) => line.trim()).filter(Boolean);
      if (spoken.length === 0) return;

      runIdRef.current += 1;
      const runId = runIdRef.current;
      const isCurrent = () => runIdRef.current === runId;

      speakingRef.current = true;
      callbacks.current.onStart?.();

      const readFrom = (index: number): void => {
        if (!isCurrent()) return;
        if (index >= spoken.length) {
          endRun();
          return;
        }

        const line = spoken[index];
        const next = () => readFrom(index + 1);

        if (!hasClip(manifestRef.current, locale, line)) {
          speakLine(line, next);
          return;
        }

        const clip = new Audio(getClipUrl(locale, line));
        clipRef.current = clip;
        clip.onended = () => {
          if (clipRef.current === clip) clipRef.current = null;
          next();
        };
        /*
         * A clip listed in the manifest but missing from disk, or refused by the browser,
         * falls through to the synthesiser rather than leaving the line unsaid.
         */
        clip.onerror = () => {
          if (clipRef.current === clip) clipRef.current = null;
          if (isCurrent()) speakLine(line, next);
        };
        clip.play().catch(() => {
          if (clipRef.current === clip) clipRef.current = null;
          if (isCurrent()) speakLine(line, next);
        });
      };

      readFrom(0);
    },
    [endRun, locale, speakLine, stop]
  );

  useEffect(() => stopClip, [stopClip]);

  const hasAnyClip = Boolean(manifest && manifest[locale]?.length);
  const available = canSynthesise || hasAnyClip;

  /*
   * Memoised for the same reason the pieces were pulled apart above: a caller puts these
   * in an effect's dependencies, and a new object every render means a reading that starts
   * over forever.
   */
  return useMemo(() => ({ available, say, stop }), [available, say, stop]);
}
