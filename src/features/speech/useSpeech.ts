"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { isWorthSpeaking, pickVoice, toSpokenText, type InstalledVoice } from "./voiceSelection";

export type Speech = {
  available: boolean;
  speaking: boolean;
  speak: (text: string) => void;
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

  const speak = useCallback(
    (text: string) => {
      const synthesis = getSynthesis();
      if (!synthesis || !voice || !isWorthSpeaking(text)) return;

      synthesis.cancel();
      finish();

      const speechId = nextSpeechIdRef.current + 1;
      nextSpeechIdRef.current = speechId;
      const utterance = new SpeechSynthesisUtterance(toSpokenText(text));
      utterance.lang = voice.lang;
      const match = synthesis.getVoices().find((candidate) => candidate.name === voice.name);
      if (match) utterance.voice = match;
      utterance.rate = 0.9;
      utterance.onend = () => finish(speechId);
      utterance.onerror = () => finish(speechId);

      activeSpeechIdRef.current = speechId;
      onSpeechStartRef.current?.();
      setSpeaking(true);
      try {
        synthesis.speak(utterance);
      } catch {
        finish(speechId);
      }
    },
    [finish, voice]
  );

  return { available: voice !== null, speaking, speak, stop };
}
