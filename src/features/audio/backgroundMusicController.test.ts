import { describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_MUSIC_SOURCE,
  BACKGROUND_MUSIC_VOLUME,
  configureBackgroundMusic,
  pauseBackgroundMusicForSpeech,
  playBackgroundMusic,
  resumeBackgroundMusicAfterSpeech,
  type BackgroundMusicAudio
} from "./backgroundMusicController";

function createAudio(play: () => Promise<void>, paused = false): BackgroundMusicAudio {
  return { src: "", loop: false, paused, preload: "auto", volume: 1, pause: vi.fn(), play };
}

describe("background music controller", () => {
  it("configures one conservative looping background track", () => {
    const audio = createAudio(async () => {});
    configureBackgroundMusic(audio);

    expect(audio.src).toBe(BACKGROUND_MUSIC_SOURCE);
    expect(audio.loop).toBe(true);
    expect(audio.preload).toBe("none");
    expect(audio.volume).toBe(BACKGROUND_MUSIC_VOLUME);
  });

  it("contains browser playback rejection", async () => {
    expect(await playBackgroundMusic(createAudio(async () => Promise.reject(new Error("blocked"))))).toBe(false);
  });

  it("pauses only music that is enabled and already playing for speech", () => {
    const playing = createAudio(async () => {});
    const paused = createAudio(async () => {}, true);

    expect(pauseBackgroundMusicForSpeech(playing, true)).toBe(true);
    expect(playing.pause).toHaveBeenCalledOnce();
    expect(pauseBackgroundMusicForSpeech(paused, true)).toBe(false);
    expect(pauseBackgroundMusicForSpeech(playing, false)).toBe(false);
  });

  it("restores only music that speech paused and contains a rejected resume", async () => {
    const audio = createAudio(async () => {});
    expect(await resumeBackgroundMusicAfterSpeech(audio, true, true)).toBe(true);
    expect(await resumeBackgroundMusicAfterSpeech(audio, false, true)).toBe(false);
    expect(await resumeBackgroundMusicAfterSpeech(audio, true, false)).toBe(false);
    expect(
      await resumeBackgroundMusicAfterSpeech(createAudio(async () => Promise.reject(new Error("blocked"))), true, true)
    ).toBe(false);
  });
});
