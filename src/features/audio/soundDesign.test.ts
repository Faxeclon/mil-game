import { describe, expect, it } from "vitest";
import {
  MAX_GAIN,
  MAX_SOUND_SECONDS,
  soundLength,
  soundNames,
  soundsFor,
  wheelTickTimes,
  type SoundName
} from "./soundDesign";

const on = { enabled: true };

/** The pitch of the first tone and of the last, which is what "rises" or "falls" means. */
function shape(name: SoundName): { first: number; last: number } {
  const tones = soundsFor(name, on);
  return { first: tones[0].hz, last: tones[tones.length - 1].hz };
}

describe("the switch decides, before anything else", () => {
  /*
   * The common case. Sound starts off on every device, so silence has to be the answer
   * that needs no special handling anywhere else in the app.
   */
  it("makes no sound at all when nobody asked for any", () => {
    for (const name of soundNames) {
      expect(soundsFor(name, { enabled: false })).toEqual([]);
    }
  });
});

describe("what a right and a wrong answer sound like", () => {
  it("rises for a right answer", () => {
    const { first, last } = shape("correct");

    expect(last).toBeGreaterThan(first);
  });

  /*
   * The rule this whole game rests on: getting it wrong is how anybody learns to look. A
   * falling tone is the sound of a telling-off, so a miss is one flat note instead.
   */
  it("never falls for a wrong one, and never scolds with a second note", () => {
    const tones = soundsFor("wrong", on);

    expect(tones).toHaveLength(1);
    expect(shape("wrong").last).toBeGreaterThanOrEqual(shape("wrong").first);
  });

  it("tells a right answer and a wrong one apart by pitch, not only by length", () => {
    expect(shape("correct").first).not.toBe(shape("wrong").first);
  });

  /* Refusing to decide, when refusing is right, is not just another hit. */
  it("gives the uncertain answer a shape of its own", () => {
    const uncertain = soundsFor("uncertainCorrect", on);
    const correct = soundsFor("correct", on);

    expect(uncertain.length).toBeGreaterThan(correct.length);
    expect(uncertain.map((tone) => tone.hz)).not.toEqual(correct.map((tone) => tone.hz));
  });
});

describe("passing the phone", () => {
  /*
   * A turn changing hands is the one moment in the game with nothing to judge. Rising
   * would congratulate the player arriving; falling would console the one leaving.
   */
  it("neither rises nor falls, because nobody won anything", () => {
    const { first, last } = shape("turnHandover");

    expect(last).toBe(first);
  });

  it("says something different from an answer being right", () => {
    expect(shape("turnHandover").first).not.toBe(shape("correct").first);
  });
});

describe("nothing that would take over a classroom", () => {
  it("keeps every effect short enough to be feedback rather than an interruption", () => {
    for (const name of soundNames) {
      expect(soundLength(soundsFor(name, on))).toBeLessThanOrEqual(MAX_SOUND_SECONDS);
    }
  });

  it("keeps every effect under a speaking voice", () => {
    for (const name of soundNames) {
      for (const tone of soundsFor(name, on)) {
        expect(tone.gain).toBeGreaterThan(0);
        expect(tone.gain).toBeLessThanOrEqual(MAX_GAIN);
      }
    }
  });

  it("steps aside while Roqui is talking rather than talking over him", () => {
    const plain = soundsFor("correct", on);
    const overSpeech = soundsFor("correct", { enabled: true, speaking: true });

    expect(overSpeech[0].gain).toBeLessThan(plain[0].gain);
    // Quieter, not different: the same sound, so it still means the same thing.
    expect(overSpeech.map((tone) => tone.hz)).toEqual(plain.map((tone) => tone.hz));
  });
});

describe("a calmer game", () => {
  it("softens what it keeps", () => {
    const plain = soundsFor("correct", on);
    const calm = soundsFor("correct", { enabled: true, calm: true });

    expect(calm[0].gain).toBeLessThan(plain[0].gain);
  });

  /*
   * The countdown warning goes entirely rather than going quiet. Somebody who asked for a
   * calmer game asked to be hurried less, and a softer alarm is still an alarm.
   */
  it("drops the countdown warning instead of turning it down", () => {
    expect(soundsFor("timeWarning", { enabled: true, calm: true })).toEqual([]);
    expect(soundsFor("timeWarning", on).length).toBeGreaterThan(0);
  });
});

describe("the wheel slowing down", () => {
  it("spreads its clicks further apart as it loses speed", () => {
    const times = wheelTickTimes(2, 12);
    const gaps = times.slice(1).map((time, index) => time - times[index]);

    for (let index = 1; index < gaps.length; index += 1) {
      expect(gaps[index]).toBeGreaterThan(gaps[index - 1]);
    }
  });

  it("finishes exactly when the wheel does", () => {
    const times = wheelTickTimes(2, 12);

    expect(times[times.length - 1]).toBeCloseTo(2, 3);
    expect(times[0]).toBeGreaterThan(0);
  });

  it("asks for nothing when there is no spin to sound out", () => {
    expect(wheelTickTimes(0, 12)).toEqual([]);
    expect(wheelTickTimes(2, 0)).toEqual([]);
    expect(wheelTickTimes(Number.NaN, 12)).toEqual([]);
  });
});
