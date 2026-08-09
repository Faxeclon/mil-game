import { describe, expect, it } from "vitest";
import {
  getClipName,
  getClipUrl,
  hasClip,
  hashLine,
  normalizeLine,
  parseClipManifest
} from "./clipCatalog";

describe("naming a recorded line", () => {
  it("gives the same name for the same words, every time", () => {
    expect(getClipName("¿Cuál fue hecha con IA?")).toBe(getClipName("¿Cuál fue hecha con IA?"));
  });

  it("gives different names to different words", () => {
    expect(getClipName("Mira las dos imágenes.")).not.toBe(getClipName("Mira la imagen."));
  });

  it("is a plain, filesystem-safe name", () => {
    expect(getClipName("¿Cuál fue hecha con IA?")).toMatch(/^[0-9a-f]{8}$/);
  });

  /*
   * The browser and the generator script have to agree on the name, and one of them will
   * eventually meet a line that was wrapped or indented differently in a JSON file.
   */
  it("ignores how the whitespace happened to fall", () => {
    expect(getClipName("  Mira   las dos\nimágenes. ")).toBe(getClipName("Mira las dos imágenes."));
    expect(normalizeLine("  a   b \n c ")).toBe("a b c");
  });

  it("keeps accents and punctuation apart, since they change how a line is read", () => {
    expect(hashLine("si")).not.toBe(hashLine("sí"));
    expect(hashLine("Vamos")).not.toBe(hashLine("¡Vamos!"));
  });

  it("puts the file where the generator writes it, one folder per language", () => {
    expect(getClipUrl("es", "Hola")).toBe(`/audio/voice/es/${getClipName("Hola")}.mp3`);
    expect(getClipUrl("en", "Hello")).toBe(`/audio/voice/en/${getClipName("Hello")}.mp3`);
  });
});

describe("knowing whether a line was ever recorded", () => {
  const manifest = { es: [getClipName("Hola"), getClipName("Adiós")] };

  it("finds a line that was generated", () => {
    expect(hasClip(manifest, "es", "Hola")).toBe(true);
  });

  it("says no for a line that was not, so it can fall back to the synthesiser", () => {
    expect(hasClip(manifest, "es", "Buenas tardes")).toBe(false);
  });

  it("does not borrow one language's recordings for another", () => {
    expect(hasClip(manifest, "en", "Hola")).toBe(false);
  });

  it("says no when there is no manifest at all", () => {
    expect(hasClip(null, "es", "Hola")).toBe(false);
  });

  /*
   * The consequence of naming clips after their text, written down as a test: change the
   * wording and the recording stops matching, so the line returns to the synthesiser
   * instead of confidently saying the old version out loud.
   */
  it("stops matching once the words change", () => {
    expect(hasClip(manifest, "es", "Hola!")).toBe(false);
  });
});

describe("reading the manifest that shipped with the game", () => {
  it("keeps a well-formed catalogue", () => {
    expect(parseClipManifest({ es: ["aaaa1111"], en: ["bbbb2222"] })).toEqual({
      es: ["aaaa1111"],
      en: ["bbbb2222"]
    });
  });

  it("falls back to nothing recorded rather than throwing", () => {
    expect(parseClipManifest(null)).toEqual({});
    expect(parseClipManifest("es")).toEqual({});
    expect(parseClipManifest({ es: "aaaa1111" })).toEqual({});
  });

  it("drops entries that are not names", () => {
    expect(parseClipManifest({ es: ["aaaa1111", 7, null] })).toEqual({ es: ["aaaa1111"] });
  });
});
