"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { isWorthSpeaking, pickVoice, toSpokenText, type InstalledVoice } from "./voiceSelection";

/**
 * Reading the game out loud, when the device can.
 *
 * Never automatic. The child presses the button, and pressing it again stops. Speech that
 * starts on its own is a distraction for the children who did not ask for it, and the
 * evidence for background sound cuts both ways depending on who is listening.
 *
 * `available` is false whenever this phone cannot read the current language, so callers
 * can hide the control rather than offer a button that stays silent.
 */
export type Speech = {
  available: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
};

function getSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  try {
    return window.speechSynthesis ?? null;
  } catch {
    return null;
  }
}

export function useSpeech(): Speech {
  const locale = useLocale();
  const [voice, setVoice] = useState<InstalledVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);

  /*
   * Android populates the voice list asynchronously, and often returns an empty array on
   * the first call. Listening for the change event is the only reliable way to learn that
   * a phone does have a Spanish voice after all.
   */
  useEffect(() => {
    const synthesis = getSynthesis();
    if (!synthesis) return;

    const refresh = () => {
      try {
        setVoice(pickVoice(synthesis.getVoices() as unknown as InstalledVoice[], locale));
      } catch {
        setVoice(null);
      }
    };

    refresh();
    synthesis.addEventListener?.("voiceschanged", refresh);
    return () => {
      synthesis.removeEventListener?.("voiceschanged", refresh);
      synthesis.cancel();
    };
  }, [locale]);

  const stop = useCallback(() => {
    getSynthesis()?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      const synthesis = getSynthesis();
      if (!synthesis || !voice || !isWorthSpeaking(text)) return;

      // A second press interrupts the first rather than queueing behind it.
      synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(toSpokenText(text));
      utterance.lang = voice.lang;
      const match = synthesis.getVoices().find((candidate) => candidate.name === voice.name);
      if (match) utterance.voice = match;
      /* Slightly under the default: the standard rate outruns a child who is still reading along. */
      utterance.rate = 0.9;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      setSpeaking(true);
      synthesis.speak(utterance);
    },
    [voice]
  );

  return { available: voice !== null, speaking, speak, stop };
}
