"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { isWorthSpeaking, pickVoice, toSpokenText, type InstalledVoice } from "./voiceSelection";

export type Speech = {
  available: boolean;
  speaking: boolean;
  /** `onDone` fires once this line has finished, however it finished. */
  speak: (text: string, onDone?: () => void) => void;
  stop: () => void;
};

type SpeechCallbacks = {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
};

function getSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  try {
    return window.speechSynthesis ?? null;
  } catch {
    return null;
  }
}

export function useSpeech({ onSpeechStart, onSpeechEnd }: SpeechCallbacks = {}): Speech {
  const locale = useLocale();
  const [voice, setVoice] = useState<InstalledVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const onSpeechStartRef = useRef(onSpeechStart);
  const onSpeechEndRef = useRef(onSpeechEnd);
  const activeSpeechIdRef = useRef<number | null>(null);
  const nextSpeechIdRef = useRef(0);

  useEffect(() => {
    onSpeechStartRef.current = onSpeechStart;
    onSpeechEndRef.current = onSpeechEnd;
  }, [onSpeechEnd, onSpeechStart]);

  const finish = useCallback((speechId?: number) => {
    if (activeSpeechIdRef.current === null) return;
    if (speechId !== undefined && activeSpeechIdRef.current !== speechId) return;

    activeSpeechIdRef.current = null;
    setSpeaking(false);
    onSpeechEndRef.current?.();
  }, []);

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
      finish();
    };
  }, [finish, locale]);

  const stop = useCallback(() => {
    getSynthesis()?.cancel();
    finish();
  }, [finish]);

  /**
   * `onDone` fires once this particular line is finished, however it finished, and only
   * while it is still the current one. It is what lets a caller read several lines in a
   * row without guessing at durations.
   */
  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      const synthesis = getSynthesis();
      if (!synthesis || !voice || !isWorthSpeaking(text)) {
        onDone?.();
        return;
      }

      synthesis.cancel();
      finish();

      const speechId = nextSpeechIdRef.current + 1;
      nextSpeechIdRef.current = speechId;
      const utterance = new SpeechSynthesisUtterance(toSpokenText(text));
      utterance.lang = voice.lang;
      const match = synthesis.getVoices().find((candidate) => candidate.name === voice.name);
      if (match) utterance.voice = match;
      /*
       * A shade slower and a shade higher than the default: the standard rate outruns a
       * child still reading along, and the flat default pitch is the part that makes a
       * synthesiser sound like a machine reading a form.
       */
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      const done = () => {
        // Only the line that is still current may report itself finished.
        if (nextSpeechIdRef.current !== speechId) return;
        finish(speechId);
        onDone?.();
      };
      utterance.onend = done;
      utterance.onerror = done;

      activeSpeechIdRef.current = speechId;
      onSpeechStartRef.current?.();
      setSpeaking(true);
      try {
        synthesis.speak(utterance);
      } catch {
        done();
      }
    },
    [finish, voice]
  );

  /*
   * Memoised so a caller can safely put this in an effect's dependency list. Returning a
   * fresh object every render once made the narrator repeat its greeting endlessly: the
   * effect that speaks saw a new value, spoke, set state, rendered, and went round again.
   */
  return useMemo(
    () => ({ available: voice !== null, speaking, speak, stop }),
    [speak, speaking, stop, voice]
  );
}
