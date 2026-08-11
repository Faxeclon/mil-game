import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("local medal toast", () => {
  it("is a non-blocking fixed portal and marks the notice presented after it mounts", async () => {
    const component = await readFile(join(process.cwd(), "src", "components", "LocalMedalToast.tsx"), "utf8");
    const css = await readFile(join(process.cwd(), "src", "components", "LocalMedalToast.module.css"), "utf8");

    expect(component).toContain("createPortal");
    expect(component).toContain("onPresented();");
    expect(component).toContain("AUTO_DISMISS_MS = 4500");
    expect(component).toContain('aria-live="polite"');
    expect(component).not.toContain("document.body.style.overflow");
    expect(css).toContain("position: fixed");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("pointer-events: auto");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
