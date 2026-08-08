import { describe, expect, it } from "vitest";
import {
  isWorthSpeaking,
  pickVoice,
  speaksLanguage,
  toSpokenText,
  type InstalledVoice
} from "./voiceSelection";

function voice(partial: Partial<InstalledVoice> & { name: string; lang: string }): InstalledVoice {
  return { localService: true, default: false, ...partial };
}

describe("matching a voice to a language", () => {
  it("treats every Spanish region, and both separators, as Spanish", () => {
    expect(speaksLanguage(voice({ name: "Paulina", lang: "es-MX" }), "es")).toBe(true);
    expect(speaksLanguage(voice({ name: "Jorge", lang: "es_ES" }), "es-PE")).toBe(true);
    expect(speaksLanguage(voice({ name: "Ana", lang: "ES" }), "es")).toBe(true);
  });

  it("does not accept a different language", () => {
    expect(speaksLanguage(voice({ name: "Daniel", lang: "en-GB" }), "es")).toBe(false);
  });
});

describe("picking the voice to read with", () => {
  /*
   * The case this whole module exists for: a cheap phone that only shipped with English.
   * Reading Spanish with an English voice is worse than staying silent, so the caller
   * needs a null it can use to hide the button.
   */
  it("returns nothing when the device has no voice in that language", () => {
    const installed = [
      voice({ name: "Daniel", lang: "en-GB", default: true }),
      voice({ name: "Karen", lang: "en-AU" })
    ];

    expect(pickVoice(installed, "es")).toBeNull();
  });

  it("prefers the exact region over another region of the same language", () => {
    const installed = [
      voice({ name: "Jorge", lang: "es-ES", default: true }),
      voice({ name: "Sofia", lang: "es-PE" })
    ];

    expect(pickVoice(installed, "es-PE")?.name).toBe("Sofia");
  });

  /*
   * A voice that needs a server is no voice at all with no signal, which is precisely
   * when this game is meant to keep working.
   */
  it("prefers a voice that works offline over the device default", () => {
    const installed = [
      voice({ name: "Nube", lang: "es-ES", localService: false, default: true }),
      voice({ name: "Local", lang: "es-ES", localService: true })
    ];

    expect(pickVoice(installed, "es")?.name).toBe("Local");
  });

  /*
   * Tone is the last thing considered, never the first: a warmer-sounding name that needs
   * a server is still silence on a phone with no signal.
   */
  it("prefers a friendlier-sounding voice among the offline ones", () => {
    const installed = [
      voice({ name: "Microsoft Raul", lang: "es-MX", default: true }),
      voice({ name: "Microsoft Sabina", lang: "es-MX" })
    ];

    expect(pickVoice(installed, "es-MX")?.name).toBe("Microsoft Sabina");
  });

  it("does not chase tone across the line into a network voice", () => {
    const installed = [
      voice({ name: "Paulina", lang: "es-MX", localService: false }),
      voice({ name: "Diego", lang: "es-MX", localService: true })
    ];

    expect(pickVoice(installed, "es-MX")?.name).toBe("Diego");
  });

  it("falls back to a network voice rather than none at all", () => {
    const installed = [voice({ name: "Nube", lang: "es-ES", localService: false })];

    expect(pickVoice(installed, "es")?.name).toBe("Nube");
  });

  it("returns nothing when the device lists no voices", () => {
    expect(pickVoice([], "es")).toBeNull();
  });
});

describe("what actually gets read out loud", () => {
  it("drops emoji and separators that would be read symbol by symbol", () => {
    expect(toSpokenText("🤖 Hecha con IA")).toBe("Hecha con IA");
    expect(toSpokenText("3 retos · Sin límite de tiempo")).toBe("3 retos. Sin límite de tiempo");
  });

  it("keeps the words and the sentence punctuation", () => {
    expect(toSpokenText("¿Cuál fue hecha con IA?")).toBe("¿Cuál fue hecha con IA?");
  });

  it("reports a string with nothing left to say", () => {
    expect(isWorthSpeaking("🔊")).toBe(false);
    expect(isWorthSpeaking("   ")).toBe(false);
    expect(isWorthSpeaking("Mira")).toBe(true);
  });
});
