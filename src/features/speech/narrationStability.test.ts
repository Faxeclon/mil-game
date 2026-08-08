import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The bug this file exists to prevent, written down.
 *
 * The narrator greeted a child, then greeted them again, and again, for as long as anyone
 * watched. Nothing was wrong with the speech: `useSpeech` returned a fresh object on every
 * render, so the function that reads a screen changed identity constantly, so the effect
 * that calls it re-ran, so it spoke, so state changed, so it rendered - round and round.
 *
 * These are source checks rather than behaviour tests because the failure lives in
 * identity, not in output: a rendering test would have watched it speak correctly once and
 * passed. What has to hold is that these hooks hand back the same values twice running.
 */
async function read(file: string): Promise<string> {
  return readFile(join(here, file), "utf8");
}

describe("hooks a caller can safely put in a dependency list", () => {
  it("does not let useSpeech hand back a new object every render", async () => {
    const source = await read("useSpeech.ts");

    expect(source).toMatch(/return useMemo\(/);
    // The shape that caused it: an object literal built fresh on the way out.
    expect(source).not.toMatch(/return \{ available:/);
  });

  it("does not let useNarration hand back a new object every render", async () => {
    const source = await read("useNarration.ts");

    expect(source).toMatch(/return useMemo\(\(\) => \(\{ available, say, stop \}\)/);
  });

  /*
   * The second way it repeated: the catalogue of recordings arrives a moment after the
   * first screen. While `say` depended on it, that arrival rebuilt the function and the
   * greeting was read a second time.
   */
  it("keeps the clip catalogue out of what rebuilds the reading function", async () => {
    const source = await read("useNarration.ts");

    expect(source).toMatch(/manifestRef\.current/);
    expect(source).toMatch(/\[endRun, locale, speakLine, stop\]/);
  });

  /*
   * And the first way: depending on the whole speech object rather than the two functions
   * on it, which are the only stable things about it.
   */
  it("takes the stable functions off the speech hook rather than the hook's object", async () => {
    const source = await read("useNarration.ts");

    // A negated character class already spans newlines, so no dotAll flag is needed here.
    expect(source).toMatch(/const \{[^}]*speak: speakLine[^}]*\} = useSpeech\(\)/);
    expect(source).not.toMatch(/speech\.speak\(/);
  });
});
