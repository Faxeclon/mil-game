import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const gatePath = join(process.cwd(), "src", "components", "IntroStoryGate.tsx");
const worldsPagePath = join(process.cwd(), "src", "app", "[locale]", "worlds", "page.tsx");

describe("IntroStoryGate", () => {
  it("intercepts only Islands and leaves the established profile guard and map intact", async () => {
    const gate = await readFile(gatePath, "utf8");
    const worldsPage = await readFile(worldsPagePath, "utf8");

    expect(gate).toContain("if (introStorySeen)");
    expect(gate).toContain("markIntroStorySeen");
    expect(worldsPage).toContain("<ProfileRouteGuard>");
    expect(worldsPage).toContain("<IntroStoryGate>");
    expect(worldsPage).toContain("<MissionMap />");
  });
});
