import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import englishMessages from "./en.json";
import spanishMessages from "./es.json";

/**
 * Every message a screen asks for has to exist in both languages.
 *
 * The sibling test in `messages.test.ts` compares Spanish against English, which catches a
 * key added to one file and forgotten in the other. It cannot catch a key that was never
 * added anywhere: missing from both, the two files still agree, and the suite stays green
 * while the screen throws MISSING_MESSAGE at the child.
 *
 * That is exactly how `islands.mascotAlt` reached the browser. So this test reads the
 * components instead of the translations: it finds each `useTranslations("namespace")`,
 * collects the literal keys asked of it, and resolves every one against both files.
 *
 * Only literal keys can be checked. A key built at runtime -- `t(`list.${key}.title`)` --
 * is invisible here by design, because its value is not known until the game runs.
 */
const projectRoot = resolve(__dirname, "..", "..");
const sourceRoot = join(projectRoot, "src");

function componentFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) return componentFiles(full);
    return full.endsWith(".tsx") ? [full] : [];
  });
}

/** `const tRank = useTranslations("rank")` -> which variable speaks for which namespace. */
const TRANSLATOR = /const\s+(\w+)\s*=\s*useTranslations\(\s*"([^"]+)"\s*\)/g;

type Request = { file: string; namespace: string; key: string };

function requestedKeys(file: string): Request[] {
  const source = readFileSync(file, "utf8");
  const requests: Request[] = [];

  for (const [, variable, namespace] of source.matchAll(TRANSLATOR)) {
    // Backticks and `$` are excluded so a key assembled at runtime is skipped, not guessed.
    const calls = new RegExp(`\\b${variable}(?:\\.rich)?\\(\\s*"([^"\`$]+)"`, "g");
    for (const [, key] of source.matchAll(calls)) {
      requests.push({ file: relative(projectRoot, file), namespace, key });
    }
  }

  return requests;
}

function lookUp(messages: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (current, part) =>
        typeof current === "object" && current !== null
          ? (current as Record<string, unknown>)[part]
          : undefined,
      messages
    );
}

const requests = componentFiles(sourceRoot).flatMap(requestedKeys);

describe("the messages the screens actually ask for", () => {
  it("finds translator calls to check, so a silent scan never passes for nothing", () => {
    // Guards the scan itself: a regex that stops matching would otherwise report success.
    expect(requests.length).toBeGreaterThan(100);
  });

  it("resolves every literal key in both languages", () => {
    const missing = requests.flatMap(({ file, namespace, key }) => {
      const path = `${namespace}.${key}`;
      return [
        ["es", spanishMessages] as const,
        ["en", englishMessages] as const
      ]
        .filter(([, messages]) => lookUp(messages, path) === undefined)
        .map(([locale]) => `${locale}.json is missing "${path}" (used in ${file})`);
    });

    expect(missing, "message keys used by a component but never written").toEqual([]);
  });
});
