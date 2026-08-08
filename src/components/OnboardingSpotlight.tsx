"use client";

import { useEffect } from "react";

type OnboardingSpotlightProps = {
  active: boolean;
  targetSelector: string;
  title: string;
  instruction: string;
};

/** A guided, keyboard-safe highlight that leaves only its target and marked controls usable. */
export function OnboardingSpotlight({ active, targetSelector, title, instruction }: OnboardingSpotlightProps) {
  const target = active && typeof document !== "undefined" ? document.querySelector<HTMLElement>(targetSelector) : null;

  useEffect(() => {
    if (!active) return;
    const found = document.querySelector<HTMLElement>(targetSelector);
    if (!found) return;
    found.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    const block = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null;
      if (!element?.closest(`${targetSelector}, [data-onboarding-allow="music"]`)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", block, true);
    document.addEventListener("pointerdown", block, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Tab") block(event);
    }, true);
    return () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("pointerdown", block, true);
    };
  }, [active, targetSelector]);

  if (!active || !target) return null;
  const rect = target.getBoundingClientRect();
  return (
    <div aria-live="assertive" className="onboarding-spotlight" role="status">
      <div aria-hidden="true" className="onboarding-shade" />
      <div aria-hidden="true" className="onboarding-hole" style={{ left: rect.left - 12, top: rect.top - 12, width: rect.width + 24, height: rect.height + 24 }} />
      <p className="onboarding-message"><strong>{title}</strong><span>{instruction}</span></p>
    </div>
  );
}
