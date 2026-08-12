import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AdultAccount } from "@/features/adults/adultAccount";
import { getChildExperienceRouteAccess } from "@/features/adults/childExperienceRouteAccess";

const family: AdultAccount = {
  email: "family@example.test",
  role: "family",
  registeredOn: "2026-08-12",
  syncPending: true
};

const teacher: AdultAccount = { ...family, email: "teacher@example.test", role: "teacher" };

const routePages = [
  ["worlds", "page.tsx"],
  ["island", "[islandKey]", "page.tsx"],
  ["level", "[levelId]", "page.tsx"],
  ["tutorial", "page.tsx"],
  ["results", "page.tsx"],
  ["island", "[islandKey]", "rush", "page.tsx"]
] as const;

async function routeSource(path: readonly string[]): Promise<string> {
  return readFile(join(process.cwd(), "src", "app", "[locale]", ...path), "utf8");
}

describe("child experience route access", () => {
  it("keeps every child route hidden until the adult session has hydrated", () => {
    expect(getChildExperienceRouteAccess(false, null)).toBe("checking");
    expect(getChildExperienceRouteAccess(false, family)).toBe("checking");
  });

  it("redirects either kind of active adult even when a child profile is valid", () => {
    expect(getChildExperienceRouteAccess(true, family)).toBe("redirect");
    expect(getChildExperienceRouteAccess(true, teacher)).toBe("redirect");
  });

  it("continues to permit direct child routes when no adult is active", () => {
    expect(getChildExperienceRouteAccess(true, null)).toBe("allowed");
  });

  it("places the adult boundary outside every child gameplay entry point", async () => {
    for (const path of routePages) {
      const page = await routeSource(path);
      expect(page).toContain("<ChildExperienceRouteGuard>");
      expect(page).toContain("<ProfileRouteGuard>");
      expect(page.indexOf("<ChildExperienceRouteGuard>")).toBeLessThan(page.indexOf("<ProfileRouteGuard>"));
    }
  });

  it("keeps the narrative gate after adult and profile protection on Islands", async () => {
    const worlds = await routeSource(["worlds", "page.tsx"]);
    expect(worlds.indexOf("<ChildExperienceRouteGuard>")).toBeLessThan(worlds.indexOf("<ProfileRouteGuard>"));
    expect(worlds.indexOf("<ProfileRouteGuard>")).toBeLessThan(worlds.indexOf("<IntroStoryGate>"));
    expect(worlds).toContain("<MissionMap />");
  });
});
