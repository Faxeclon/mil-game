import { describe, expect, it } from "vitest";
import { getLocaleSwitchPath } from "./localeSwitchPath";

describe("getLocaleSwitchPath", () => {
  it("preserves the current encoded query when changing locales", () => {
    const query = new URLSearchParams("attempt=attempt_123&filter=latest%20result");
    expect(getLocaleSwitchPath("/results", query)).toBe("/results?attempt=attempt_123&filter=latest+result");
  });

  it("keeps a clean pathname when there is no query", () => {
    expect(getLocaleSwitchPath("/worlds", new URLSearchParams())).toBe("/worlds");
  });
});
