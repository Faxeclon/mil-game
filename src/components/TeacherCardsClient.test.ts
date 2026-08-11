import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("teacher QR card printing", () => {
  it("uses a portrait A4 page and one fixed printable card area per student", async () => {
    const [css, globals] = await Promise.all([
      readFile(join(process.cwd(), "src", "components", "TeacherCardsClient.module.css"), "utf8"),
      readFile(join(process.cwd(), "src", "app", "globals.css"), "utf8")
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
    const css = await readFile(join(process.cwd(), "src", "components", "TeacherCardsClient.module.css"), "utf8");

    expect(css).toContain(".card {\n    min-height: 277mm;\n    height: 277mm;");
    expect(css).toContain(".sheet:last-child {\n    break-after: auto;\n    page-break-after: auto;");
  });
});
