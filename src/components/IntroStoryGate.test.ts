import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getIntroStoryAccess } from "@/features/onboarding/introStoryAccess";

const gatePath = join(process.cwd(), "src", "components", "IntroStoryGate.tsx");
const worldsPagePath = join(process.cwd(), "src", "app", "[locale]", "worlds", "page.tsx");

describe("IntroStoryGate", () => {
  it("intercepts only Islands and leaves the established profile guard and map intact", async () => {
    const gate = await readFile(gatePath, "utf8");
    const worldsPage = await readFile(worldsPagePath, "utf8");

    expect(gate).toContain("getIntroStoryAccess(hydrated, introStorySeen)");
    expect(gate).toContain('access === "checking"');
    expect(gate).toContain("markIntroStorySeen");
    expect(worldsPage).toContain("<ProfileRouteGuard>");
    expect(worldsPage).toContain("<IntroStoryGate>");
    expect(worldsPage).toContain("<MissionMap />");
  });

  it("waits for progress hydration before choosing story or map", () => {
    expect(getIntroStoryAccess(false, false)).toBe("checking");
    expect(getIntroStoryAccess(true, false)).toBe("story");
    expect(getIntroStoryAccess(true, true)).toBe("map");
  });
});
