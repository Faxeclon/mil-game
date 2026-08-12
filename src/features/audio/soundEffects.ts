"use client";

import { readAccessibility } from "@/features/accessibility/accessibilityStore";
import { readSoundEnabled } from "./soundPreference";
import { soundLength, soundsFor, wheelTickTimes, type SoundName, type Tone } from "./soundDesign";

/**
 * Plays the effects the game describes, using tones the browser makes itself.
 *
 * Everything worth arguing about lives in `soundDesign`, which is pure and tested. This is
 * the thin part: one audio context, opened on the first sound rather than on page load,
 * and an envelope on every tone so nothing arrives as a click.
 *
 * It never asks whether it may make noise - it reads the same device switch the music
 * reads, every time, so turning sound off silences this without a single screen knowing.
 */
let context: AudioContext | null = null;

type AudioContextConstructor = new () => AudioContext;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    context = new Ctor();
    return context;
  } catch {
    // A browser that refuses an audio context simply plays nothing.
    return null;
  }
}

/**
 * One tone, with the shape that keeps it from clicking.
 *
 * The ramps are the whole difference between a chime and a beep: ten milliseconds up so
 * the speaker never jumps, then an exponential fall, which is how anything struck - a
 * bell, a key, a glass - actually fades.
 */
function playTone(ctx: AudioContext, tone: Tone, startAt: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = tone.wave;
  oscillator.frequency.setValueAtTime(tone.hz, startAt);

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(tone.gain, startAt + 0.01);
  // Exponential ramps cannot reach zero, so it lands just above it and stops there.
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.seconds);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + tone.seconds + 0.02);
}

/*
 * Whether a voice is reading right now.
 *
 * Set by the narration while it speaks, so an effect can step under it. Kept here as a
 * plain flag rather than passed down through screens: the two never render together, and
 * threading it through every component that makes a sound would put a wire in a dozen
 * files to carry one boolean.
 */
let speaking = false;

export function setNarrationSpeaking(value: boolean): void {
  speaking = value;
}

/*
 * The music stepping aside for an effect, the same way it steps aside for a voice.
 *
 * Handed in by the provider that owns the audio element rather than read from a context,
 * because effects are played from plain handlers rather than from hooks. The controller
 * behind these counts its callers, so an effect landing mid-sentence does not lift the
 * music back up while Roqui is still talking.
 */
type MusicDucking = { duck: () => void; restore: () => void };

let ducking: MusicDucking | null = null;

export function connectMusicDucking(controls: MusicDucking | null): void {
  ducking = controls;
}

function duckWhile(seconds: number): void {
  if (!ducking) return;
  const controls = ducking;
  controls.duck();
  // A little past the last tone, so the music does not swell back over its own tail.
  window.setTimeout(() => controls.restore(), Math.round(seconds * 1000) + 160);
}

function currentContext() {
  return { enabled: readSoundEnabled(), calm: readAccessibility().reducedMotion, speaking };
}

/** Plays one effect. Silent, and cheap, when the device has sound switched off. */
export function playSound(name: SoundName): void {
  const tones = soundsFor(name, currentContext());
  if (tones.length === 0) return;

  const ctx = getContext();
  if (!ctx) return;
  // A context created before the first tap starts suspended; the tap is what resumes it.
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

  const start = ctx.currentTime + 0.005;
  for (const tone of tones) playTone(ctx, tone, start + tone.at);
  duckWhile(soundLength(tones));
}

/**
 * The wheel: clicks that spread apart as it slows, then the reward.
 *
 * Scheduled in one go rather than with timers, because the audio clock keeps time far
 * better than `setTimeout` on a phone that is also animating a spinning wheel.
 */
export function playWheelSpin(seconds: number, clicks = 14): void {
  const settings = currentContext();
  const tick = soundsFor("wheelTick", settings);
  if (tick.length === 0) return;

  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

  const start = ctx.currentTime + 0.005;
  for (const at of wheelTickTimes(seconds, clicks)) {
    for (const tone of tick) playTone(ctx, tone, start + at + tone.at);
  }

  const reward = soundsFor("wheelReward", settings);
  for (const tone of reward) playTone(ctx, tone, start + seconds + 0.08 + tone.at);
  duckWhile(seconds + 0.08 + soundLength(reward));
}

/** Test helper: forgets the audio context so the next sound opens a fresh one. */
export function resetSoundEffectsForTests(): void {
  context = null;
  speaking = false;
  ducking = null;
}
