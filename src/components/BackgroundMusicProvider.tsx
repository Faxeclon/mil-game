"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import {
  configureBackgroundMusic,
  NarrationDuckingController,
  playBackgroundMusic
} from "@/features/audio/backgroundMusicController";
import { connectMusicDucking } from "@/features/audio/soundEffects";
import { setSoundEnabled, useSoundEnabled } from "@/features/audio/soundPreference";

type BackgroundMusicContextValue = {
  enabled: boolean;
  toggleMusic: () => void;
  enableForNewProfile: () => void;
  /** Turns the music down while the narrator speaks, and back up afterwards. */
  duckForSpeech: () => void;
  restoreAfterSpeech: () => void;
};

const BackgroundMusicContext = createContext<BackgroundMusicContextValue | null>(null);

export function BackgroundMusicProvider({ children }: { children: React.ReactNode }) {
  const enabled = useSoundEnabled();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackAllowed = useRef(false);
  const duckingController = useRef(new NarrationDuckingController(audioRef));

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      configureBackgroundMusic(audio);
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const resume = useCallback(async () => {
    const didPlay = await playBackgroundMusic(getAudio());
    if (didPlay) playbackAllowed.current = true;
    return didPlay;
  }, [getAudio]);

  const toggleMusic = useCallback(() => {
    const nextEnabled = !enabled;
    setSoundEnabled(nextEnabled);
    if (nextEnabled) {
      void resume();
    } else {
      audioRef.current?.pause();
    }
  }, [enabled, resume]);

  const enableForNewProfile = useCallback(() => {
    setSoundEnabled(true);
    void resume();
  }, [resume]);

  const duckForSpeech = useCallback(() => duckingController.current.start(), []);

  const restoreAfterSpeech = useCallback(() => duckingController.current.stop(), []);

  /*
   * Hands the same ducking to the sound effects, which are played from plain handlers
   * rather than from hooks and so cannot reach this context on their own. The controller
   * counts its callers, so a chime landing mid-sentence never lifts the music back over
   * a voice that is still reading.
   */
  useEffect(() => {
    connectMusicDucking({ duck: duckForSpeech, restore: restoreAfterSpeech });
    return () => connectMusicDucking(null);
  }, [duckForSpeech, restoreAfterSpeech]);

  useEffect(() => {
    if (!enabled || playbackAllowed.current) return;

    const onInteraction = () => {
      void resume().then((didPlay) => {
        if (didPlay) {
          window.removeEventListener("pointerdown", onInteraction);
          window.removeEventListener("keydown", onInteraction);
        }
      });
    };
    window.addEventListener("pointerdown", onInteraction);
    window.addEventListener("keydown", onInteraction);
    return () => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
    };
  }, [enabled, resume]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        audioRef.current?.pause();
      } else if (enabled && playbackAllowed.current) {
        void resume();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [enabled, resume]);

  useEffect(() => {
    const controller = duckingController.current;
    return () => {
      controller.restoreAll();
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return (
    <BackgroundMusicContext.Provider value={{ enabled, toggleMusic, enableForNewProfile, duckForSpeech, restoreAfterSpeech }}>
      {children}
    </BackgroundMusicContext.Provider>
  );
}

export function useBackgroundMusic(): BackgroundMusicContextValue {
  const value = useContext(BackgroundMusicContext);
  if (!value) throw new Error("useBackgroundMusic must be used within BackgroundMusicProvider");
  return value;
}
