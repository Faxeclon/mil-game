const feedbackRoquiSources = [
  "/media/ui/roqui-feedback/roqui-success.png",
  "/media/ui/roqui-feedback/roqui-oops.png"
] as const;

/** Warm the two feedback poses while a mission is playable, before either can be shown. */
export function preloadFeedbackRoqui() {
  if (typeof window === "undefined") return;

  for (const source of feedbackRoquiSources) {
    const image = new window.Image();
    image.src = source;
  }
}
