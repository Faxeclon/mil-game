import { describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_MUSIC_DUCKED_VOLUME,
  BACKGROUND_MUSIC_SOURCE,
  BACKGROUND_MUSIC_VOLUME,
  configureBackgroundMusic,
  duckBackgroundMusicForSpeech,
  playBackgroundMusic,
  restoreBackgroundMusicAfterSpeech,
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

  /*
   * Turned down rather than stopped. The narrator speaks on arriving at a screen, so a
   * track that stopped for every line would spend more time restarting than playing, and
   * the silence in between reads as the music being broken.
   */
  it("turns the music down for speech instead of stopping it", () => {
    const audio = createAudio(async () => {});
    configureBackgroundMusic(audio);

    duckBackgroundMusicForSpeech(audio);

    expect(audio.volume).toBe(BACKGROUND_MUSIC_DUCKED_VOLUME);
    expect(audio.volume).toBeLessThan(BACKGROUND_MUSIC_VOLUME);
    expect(audio.volume).toBeGreaterThan(0);
    expect(audio.pause).not.toHaveBeenCalled();
  });

  /*
   * Speech ends in more ways than it starts: finished, cut off by the next line, or left
   * behind when the child leaves the screen. Every one of them has to give the music back.
   */
  it("gives the volume back however the speech ended", () => {
    const audio = createAudio(async () => {});
    configureBackgroundMusic(audio);

    duckBackgroundMusicForSpeech(audio);
    restoreBackgroundMusicAfterSpeech(audio);
    expect(audio.volume).toBe(BACKGROUND_MUSIC_VOLUME);

    // Restoring without ducking first must not leave the track at some other level.
    restoreBackgroundMusicAfterSpeech(audio);
    expect(audio.volume).toBe(BACKGROUND_MUSIC_VOLUME);
  });

  it("does nothing at all when there is no track yet", () => {
    expect(() => duckBackgroundMusicForSpeech(null)).not.toThrow();
    expect(() => restoreBackgroundMusicAfterSpeech(null)).not.toThrow();
  });
});
