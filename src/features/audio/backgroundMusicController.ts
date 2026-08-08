export const BACKGROUND_MUSIC_SOURCE = "/audio/kikiria-background.mp3";
export const BACKGROUND_MUSIC_VOLUME = 0.25;

export type BackgroundMusicAudio = Pick<HTMLAudioElement, "loop" | "paused" | "preload" | "src" | "volume" | "pause" | "play">;

/** A small wrapper keeps browser-media failures out of UI event handlers. */
export function configureBackgroundMusic(audio: BackgroundMusicAudio): void {
  audio.src = BACKGROUND_MUSIC_SOURCE;
  audio.loop = true;
  audio.preload = "none";
  audio.volume = BACKGROUND_MUSIC_VOLUME;
}

export async function playBackgroundMusic(audio: BackgroundMusicAudio): Promise<boolean> {
  try {
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

/** Gives requested speech a quiet background without creating another audio player. */
export function pauseBackgroundMusicForSpeech(
  audio: BackgroundMusicAudio | null,
  enabled: boolean
): boolean {
  if (!audio || !enabled || audio.paused) return false;
  audio.pause();
  return true;
}

/** Restores only music that was actually playing before speech started. */
export async function resumeBackgroundMusicAfterSpeech(
  audio: BackgroundMusicAudio | null,
  enabled: boolean,
  wasPlaying: boolean
): Promise<boolean> {
  if (!audio || !enabled || !wasPlaying) return false;
  return playBackgroundMusic(audio);
}
