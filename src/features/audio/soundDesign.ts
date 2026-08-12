/**
 * What the game sounds like, described rather than played.
 *
 * Every effect is a handful of tones the browser can make on its own, so nothing is
 * downloaded and nothing has to be licensed. On a shared phone with intermittent
 * internet that matters more than fidelity: these work the first time the app opens,
 * offline, and add nothing to what the service worker has to keep.
 *
 * The description is kept apart from the playing on purpose. A list of tones can be
 * checked by a test - that a right answer rises, that nothing is loud, that nothing runs
 * long enough to talk over a classroom - while an `AudioContext` cannot be checked at all.
 */
export type Waveform = "sine" | "triangle" | "square";

export type Tone = {
  /** Pitch in hertz. */
  hz: number;
  /** When it starts, in seconds from the beginning of the effect. */
  at: number;
  seconds: number;
  /** Peak volume, 0 to 1. Never the whole way: this plays over a lesson. */
  gain: number;
  wave: Waveform;
};

export const soundNames = [
  "correct",
  "wrong",
  "uncertainCorrect",
  "missionComplete",
  "medal",
  "shieldSaved",
  "timeWarning",
  "turnHandover",
  "wheelTick",
  "wheelReward"
] as const;

export type SoundName = (typeof soundNames)[number];

/**
 * A ceiling on length, because this plays in a room with thirty children in it.
 *
 * Anything longer stops being feedback and becomes an interruption: the next child is
 * already lifting their card while the last one's answer is still singing.
 */
export const MAX_SOUND_SECONDS = 0.45;

/** A ceiling on loudness. Feedback should sit under a speaking voice, never over it. */
export const MAX_GAIN = 0.22;

/** How much quieter everything goes while Roqui is speaking. */
export const DUCKED_GAIN_FACTOR = 0.35;

/** How much quieter everything goes for a player who asked for a calmer game. */
const CALM_GAIN_FACTOR = 0.6;

export type SoundContext = {
  /** The device-wide switch. It starts off, and nothing may sound until it is on. */
  enabled: boolean;
  /** True for a player using a calm preset, where less is offered rather than more. */
  calm?: boolean;
  /** True while a voice is reading, so the effect steps under it instead of over it. */
  speaking?: boolean;
};

/*
 * A right answer rises and a wrong one does not fall.
 *
 * Falling reads as a telling-off, and this game's whole claim is that getting it wrong is
 * how anybody learns to look. So a miss is one short, plain note - different enough to be
 * unmistakable, flat enough to carry no verdict.
 */
const designs: Record<SoundName, readonly Tone[]> = {
  correct: [
    { hz: 660, at: 0, seconds: 0.09, gain: 0.198, wave: "triangle" },
    { hz: 880, at: 0.07, seconds: 0.14, gain: 0.176, wave: "triangle" }
  ],
  wrong: [{ hz: 392, at: 0, seconds: 0.17, gain: 0.154, wave: "sine" }],
  /*
   * "You cannot tell" answered correctly is the hardest thing this game teaches, and the
   * only round where the right answer is to refuse to decide. It gets a shape of its own -
   * two even notes and a lift - so a child hears that it was not just another hit.
   */
  uncertainCorrect: [
    { hz: 494, at: 0, seconds: 0.08, gain: 0.165, wave: "triangle" },
    { hz: 494, at: 0.1, seconds: 0.08, gain: 0.165, wave: "triangle" },
    { hz: 740, at: 0.2, seconds: 0.16, gain: 0.187, wave: "triangle" }
  ],
  missionComplete: [
    { hz: 523, at: 0, seconds: 0.1, gain: 0.176, wave: "triangle" },
    { hz: 659, at: 0.09, seconds: 0.1, gain: 0.176, wave: "triangle" },
    { hz: 784, at: 0.18, seconds: 0.2, gain: 0.198, wave: "triangle" }
  ],
  medal: [
    { hz: 784, at: 0, seconds: 0.1, gain: 0.165, wave: "sine" },
    { hz: 1047, at: 0.08, seconds: 0.22, gain: 0.154, wave: "sine" }
  ],
  /* Being saved is a relief, not a prize: it lands rather than climbs. */
  shieldSaved: [
    { hz: 587, at: 0, seconds: 0.09, gain: 0.176, wave: "sine" },
    { hz: 440, at: 0.08, seconds: 0.18, gain: 0.154, wave: "sine" }
  ],
  /* One warning, once. A ticking clock is exactly the pressure this game avoids. */
  timeWarning: [{ hz: 587, at: 0, seconds: 0.12, gain: 0.143, wave: "sine" }],
  /*
   * The phone changing hands. Two even notes, neither rising nor falling: nobody has won
   * or lost anything here, and a turn passing is the one moment in the game that carries
   * no verdict at all. It only has to say "look up, it is you now".
   */
  turnHandover: [
    { hz: 659, at: 0, seconds: 0.08, gain: 0.143, wave: "sine" },
    { hz: 659, at: 0.13, seconds: 0.1, gain: 0.143, wave: "sine" }
  ],
  wheelTick: [{ hz: 1180, at: 0, seconds: 0.025, gain: 0.099, wave: "square" }],
  wheelReward: [
    { hz: 523, at: 0, seconds: 0.16, gain: 0.165, wave: "triangle" },
    { hz: 659, at: 0.04, seconds: 0.18, gain: 0.154, wave: "triangle" },
    { hz: 784, at: 0.08, seconds: 0.24, gain: 0.176, wave: "triangle" }
  ]
};

function scaled(tones: readonly Tone[], factor: number): Tone[] {
  return tones.map((tone) => ({ ...tone, gain: Math.min(MAX_GAIN, tone.gain * factor) }));
}

/**
 * The tones for one effect, or nothing at all.
 *
 * An empty list is a real answer and the common one: the sound switch starts off, so a
 * device nobody has asked for noise on stays silent through the whole game.
 */
export function soundsFor(name: SoundName, context: SoundContext): Tone[] {
  if (!context.enabled) return [];
  // A calmer game means fewer interruptions, not quieter ones: this alarm simply goes.
  if (context.calm && name === "timeWarning") return [];

  let factor = 1;
  if (context.calm) factor *= CALM_GAIN_FACTOR;
  if (context.speaking) factor *= DUCKED_GAIN_FACTOR;
  return scaled(designs[name], factor);
}

/** How long an effect runs from its first tone to its last, in seconds. */
export function soundLength(tones: readonly Tone[]): number {
  return tones.reduce((longest, tone) => Math.max(longest, tone.at + tone.seconds), 0);
}

/**
 * When each click of the spinning wheel falls.
 *
 * A real wheel does not tick evenly: the gaps widen as it loses speed, and that widening
 * is the whole sound of something slowing down. The times follow the same ease-out the
 * wheel is drawn with, so what is heard and what is seen are the one movement.
 */
export function wheelTickTimes(seconds: number, clicks: number): number[] {
  if (!Number.isFinite(seconds) || seconds <= 0 || clicks <= 0) return [];
  return Array.from({ length: clicks }, (_, index) => {
    /*
     * The clicks are evenly spaced around the wheel, so what decides *when* each one is
     * heard is the time the wheel takes to reach it. That is the easing read backwards:
     * the drawing turns time into rotation, and this turns rotation back into time.
     */
    const turned = (index + 1) / clicks;
    return Number((seconds * (1 - Math.cbrt(1 - turned))).toFixed(4));
  });
}
