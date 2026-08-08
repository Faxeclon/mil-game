"use client";

import { useEffect } from "react";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";
import { useNarration } from "@/features/speech/useNarration";
import { useBackgroundMusic } from "./BackgroundMusicProvider";

type NarratorProps = {
  /** Everything that should be read, in the order a child would meet it on screen. */
  lines: Array<string | null | undefined>;
};

/**
 * Reads the screen out loud, on its own.
 *
 * There is deliberately no button. A child who needs this cannot read a control that
 * offers it, which made the earlier on-demand version quietly useless to the very people
 * it was for. Turning the voice on is the decision; after that it simply narrates.
 *
 * It renders nothing at all, which is also why it can sit anywhere - including inside the
 * full-screen tap targets of the intro and the briefing, where a real button could not.
 *
 * Nothing happens unless the child asked for the voice *and* something can speak their
 * language. Browsers refuse speech until the page has been interacted with; by the time
 * anyone is here they have tapped through a menu to switch this on, so the first line is
 * normally allowed.
 */
export function Narrator({ lines }: NarratorProps) {
  const { readAloud } = useAccessibility();
  const { duckForSpeech, restoreAfterSpeech } = useBackgroundMusic();
  /*
   * The music is turned down while the voice talks, not stopped. Stopping it between
   * every line would make the track spend more time restarting than playing, and the gaps
   * read as the music being broken.
   */
  const { available, say, stop } = useNarration({
    onStart: duckForSpeech,
    onEnd: restoreAfterSpeech
  });

  /*
   * Joined on a newline only so React has a stable value to compare: an array literal is a
   * new object on every render. A newline cannot occur inside these lines, so splitting it
   * back gives exactly what came in - and they stay separate on purpose, because each one
   * has to be matched against a recording of its own.
   */
  const script = lines
    .filter((line): line is string => Boolean(line && line.trim()))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n");

  useEffect(() => {
    // A new screen interrupts the previous reading rather than queueing behind it.
    stop();
    if (!readAloud || !available || !script) return;
    say(script.split("\n"));
  }, [available, readAloud, say, script, stop]);

  return null;
}
