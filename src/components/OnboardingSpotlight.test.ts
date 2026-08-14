import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("OnboardingSpotlight", () => {
  it("removes the exact global keyboard handler when the spotlight closes", async () => {
    const component = await readFile(join(process.cwd(), "src", "components", "OnboardingSpotlight.tsx"), "utf8");

    expect(component).toContain("const onKeyDown = (event: KeyboardEvent)");
    expect(component).toContain('document.addEventListener("keydown", onKeyDown, true)');
    expect(component).toContain('document.removeEventListener("keydown", onKeyDown, true)');
  });
});
