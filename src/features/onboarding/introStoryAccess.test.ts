import { describe, expect, it } from "vitest";
import { getIntroStoryAccess } from "./introStoryAccess";

describe("intro story route access", () => {
  it("does not render the map or make a story decision while local progress is unresolved", () => {
    expect(getIntroStoryAccess(false, false)).toBe("checking");
    expect(getIntroStoryAccess(false, true)).toBe("checking");
  });

  it("shows the story immediately after a newly created child profile hydrates", () => {
    expect(getIntroStoryAccess(true, false)).toBe("story");
  });

  it("shows the map after Skip or the final CTA persist that the story was seen", () => {
    expect(getIntroStoryAccess(true, true)).toBe("map");
  });

  it("keeps an unfinished story pending when a child leaves and returns without completing it", () => {
    expect(getIntroStoryAccess(true, false)).toBe("story");
  });
});
