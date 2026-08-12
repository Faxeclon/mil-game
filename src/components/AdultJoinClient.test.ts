import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AdultAccount } from "@/features/adults/adultAccount";
import { getAdultJoinRouteAccess } from "@/features/adults/adultJoinRouteAccess";

const family: AdultAccount = {
  email: "family@example.test",
  role: "family",
  registeredOn: "2026-08-12",
  syncPending: true
};

const teacher: AdultAccount = { ...family, email: "teacher@example.test", role: "teacher" };
const componentPath = join(process.cwd(), "src", "components", "AdultJoinClient.tsx");

describe("AdultJoinClient route access", () => {
  it("does not navigate while the local adult session is still hydrating", () => {
    expect(getAdultJoinRouteAccess(false, null)).toEqual({ kind: "checking" });
    expect(getAdultJoinRouteAccess(false, family)).toEqual({ kind: "checking" });
  });

  it("redirects a hydrated family account to its adult home", () => {
    expect(getAdultJoinRouteAccess(true, family)).toEqual({ kind: "redirect", path: "/adult" });
  });

  it("redirects a hydrated teacher account to its teacher home", () => {
    expect(getAdultJoinRouteAccess(true, teacher)).toEqual({ kind: "redirect", path: "/teacher" });
  });

  it("keeps the normal join flow when no adult is active", () => {
    expect(getAdultJoinRouteAccess(true, null)).toEqual({ kind: "join" });
  });

  it("performs the redirect from an effect, never while rendering", async () => {
    const component = await readFile(componentPath, "utf8");
    const effectIndex = component.indexOf("useEffect(() =>");
    const replaceIndex = component.indexOf("router.replace(access.path)");

    expect(effectIndex).toBeGreaterThan(-1);
    expect(replaceIndex).toBeGreaterThan(effectIndex);
    expect(component).toContain('if (access.kind === "checking")');
    expect(component).toContain('if (access.kind === "redirect")');
  });
});
