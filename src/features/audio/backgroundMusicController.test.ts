import { describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_MUSIC_SOURCE,
  BACKGROUND_MUSIC_VOLUME,
  configureBackgroundMusic,
  playBackgroundMusic,
  type BackgroundMusicAudio
} from "./backgroundMusicController";

function createAudio(play: () => Promise<void>): BackgroundMusicAudio {
  return { src: "", loop: false, preload: "auto", volume: 1, pause: vi.fn(), play };
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
});
