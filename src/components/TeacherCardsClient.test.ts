import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/*
 * Read with the line endings normalised.
 *
 * Windows checks these files out with CRLF, so a rule written here as "\n    height" is
 * "\r\n    height" on disk and every multi-line assertion below fails on half the team's
 * machines - for a difference that changes nothing about how the page prints.
 */
async function readCss(...path: string[]): Promise<string> {
  return (await readFile(join(process.cwd(), ...path), "utf8")).replace(/\r\n/g, "\n");
}

describe("teacher QR card printing", () => {
  it("uses a portrait A4 page and one fixed printable card area per student", async () => {
    const [css, globals] = await Promise.all([
      readCss("src", "components", "TeacherCardsClient.module.css"),
      readCss("src", "app", "globals.css")
    ]);

    expect(css).toContain("@media print");
    expect(css).toContain("@page {");
    expect(css).toContain("size: A4 portrait");
    expect(css).toContain("margin: 1cm");
    expect(css).toContain("width: 190mm");
    expect(css).toContain("height: 277mm");
    expect(css).toContain("break-after: page");
    expect(css).toContain("page-break-after: always");
    expect(globals).toContain("* { box-sizing: border-box; }");
  });

  it("keeps the bordered card inside the printable area and removes the final page break", async () => {
    const css = await readCss("src", "components", "TeacherCardsClient.module.css");

    expect(css).toContain(".card {\n    min-height: 277mm;\n    height: 277mm;");
    expect(css).toContain(".sheet:last-child {\n    break-after: auto;\n    page-break-after: auto;");
  });
});
