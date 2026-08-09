type FeedbackTarget = Pick<HTMLElement, "focus" | "scrollIntoView">;

/**
 * Brings the explanation and its next-step action into view after an answer is locked.
 * Focus remains programmatic so the surrounding section is announced without adding a
 * redundant control to the tab order.
 */
export function revealRoundFeedback(target: FeedbackTarget, reducedMotion: boolean) {
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
}
