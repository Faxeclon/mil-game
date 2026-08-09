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

/**
 * How loud the music stays while the narrator is talking.
 *
 * Turned down rather than stopped. Silence between every line reads as the music being
 * broken, and on a screen where the voice speaks on arrival the track would spend more
 * time stopping and starting than playing. Low enough that words win, loud enough that
 * the room does not fall silent.
 */
export const BACKGROUND_MUSIC_DUCKED_VOLUME = 0.06;

/** Makes room for the narrator without stopping the track. */
export function duckBackgroundMusicForSpeech(audio: BackgroundMusicAudio | null): void {
  if (!audio) return;
  audio.volume = BACKGROUND_MUSIC_DUCKED_VOLUME;
}

/**
 * Puts the music back where it was.
 *
 * Unconditional on purpose: speech can end in more ways than it starts - finished,
 * cancelled by the next line, interrupted by leaving the screen - and every one of them
 * has to leave the music audible again. Setting a volume on a paused track is harmless,
 * so there is nothing to check first.
 */
export function restoreBackgroundMusicAfterSpeech(audio: BackgroundMusicAudio | null): void {
  if (!audio) return;
  audio.volume = BACKGROUND_MUSIC_VOLUME;
}
