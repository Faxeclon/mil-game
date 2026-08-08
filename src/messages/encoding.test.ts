import { describe, expect, it } from "vitest";
import englishMessages from "./en.json";
import spanishMessages from "./es.json";

/**
 * Accents that survived being written to disk.
 *
 * Spanish copy keeps arriving with its accents replaced by question marks - "Demostraci?n
 * de amigos" - because something along the way saved UTF-8 as the system codepage. It is
 * invisible in a diff full of prose and it reaches a child's screen intact, so it is
 * checked here rather than trusted to whoever reads the file next.
 *
 * The rule is not "no question marks": a Spanish question is welcome, it just has to open
 * with an inverted one. What cannot happen is a lone "?" standing where a letter was.
 */
function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value !== "object" || value === null) return [];

  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, path ? `${path}.${key}` : key)
  );
}

const locales = [
  { locale: "es", messages: spanishMessages as unknown },
  { locale: "en", messages: englishMessages as unknown }
] as const;

describe("the accents survived being saved", () => {
  it("never leaves a question mark standing between two letters", () => {
    const damaged = locales.flatMap(({ locale, messages }) =>
      leaves(messages)
        .filter(([, text]) => /\p{L}\?\p{L}/u.test(text))
        .map(([path, text]) => `${locale}.json ${path}: ${text}`)
    );

    expect(damaged, "an accent was replaced by a question mark").toEqual([]);
  });

  it("opens every Spanish question with an inverted mark", () => {
    // A "?" with nothing opening it is either bad punctuation or a lost accent. Both are
    // worth failing over, and both are invisible when skimming a diff.
    const unopened = leaves(spanishMessages as unknown)
      .filter(([, text]) => text.includes("?") && !text.includes("¿"))
      .map(([path, text]) => `es.json ${path}: ${text}`);

    expect(unopened, "a Spanish question mark with no opening ¿").toEqual([]);
  });

  it("carries no replacement character, which is the other way this breaks", () => {
    const damaged = locales.flatMap(({ locale, messages }) =>
      leaves(messages)
        .filter(([, text]) => text.includes("�"))
        .map(([path]) => `${locale}.json ${path}`)
    );

    expect(damaged, "U+FFFD in a message").toEqual([]);
  });

  it("still has the accented Spanish it is supposed to have, so nobody 'fixes' this by removing them", () => {
    const accented = leaves(spanishMessages as unknown).filter(([, text]) =>
      /[áéíóúñ¿¡]/i.test(text)
    );

    expect(accented.length).toBeGreaterThan(50);
  });
});
