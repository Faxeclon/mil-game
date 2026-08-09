import { describe, expect, it, vi } from "vitest";
import { revealRoundFeedback } from "./feedbackNavigation";

describe("revealRoundFeedback", () => {
  it("focuses the feedback and scrolls it naturally into view", () => {
    const target = { focus: vi.fn(), scrollIntoView: vi.fn() };

    revealRoundFeedback(target, false);

    expect(target.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("uses immediate scrolling when reduced motion is active", () => {
    const target = { focus: vi.fn(), scrollIntoView: vi.fn() };

    revealRoundFeedback(target, true);

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
  });
});
