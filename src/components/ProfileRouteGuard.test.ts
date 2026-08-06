import { describe, expect, it } from "vitest";
import { initialProgressState } from "@/features/progress/progressState";
import { getProfileRouteAccess } from "@/features/profiles/profileRouteAccess";

describe("profile route access", () => {
  it("keeps protected gameplay hidden while browser-local progress is unresolved", () => {
    expect(getProfileRouteAccess(false, false, initialProgressState)).toBe("checking");
  });

  it("denies direct tutorial and level access without a completed local profile", () => {
    expect(getProfileRouteAccess(true, false, initialProgressState)).toBe("denied");
    expect(
      getProfileRouteAccess(true, true, { ...initialProgressState, onboarded: true })
    ).toBe("denied");
  });

  it("permits a valid active local profile", () => {
    expect(
      getProfileRouteAccess(true, true, { ...initialProgressState, localNickname: "Luna" })
    ).toBe("allowed");
  });
});
