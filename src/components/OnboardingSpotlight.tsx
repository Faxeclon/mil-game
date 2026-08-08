"use client";

import { useEffect, useState } from "react";

type OnboardingSpotlightProps = {
  active: boolean;
  targetSelector: string;
  title: string;
  instruction: string;
};

/** A guided, keyboard-safe highlight that leaves only its target and marked controls usable. */
export function OnboardingSpotlight({ active, targetSelector, title, instruction }: OnboardingSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) return;
    const found = document.querySelector<HTMLElement>(targetSelector);
    if (!found) return;
    const update = () => setRect(found.getBoundingClientRect());
    update();
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
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Tab") block(event);
    }, true);
    return () => {
      document.removeEventListener("click", block, true);
      document.removeEventListener("pointerdown", block, true);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, targetSelector]);

  if (!active || !rect) return null;
  return (
    <div aria-live="assertive" className="onboarding-spotlight" role="status">
      <div aria-hidden="true" className="onboarding-region" style={{ left: 0, top: 0, right: 0, height: Math.max(0, rect.top - 12) }} />
      <div aria-hidden="true" className="onboarding-region" style={{ left: 0, top: rect.top - 12, width: Math.max(0, rect.left - 12), height: rect.height + 24 }} />
      <div aria-hidden="true" className="onboarding-region" style={{ left: rect.right + 12, top: rect.top - 12, right: 0, height: rect.height + 24 }} />
      <div aria-hidden="true" className="onboarding-region" style={{ left: 0, top: rect.bottom + 12, right: 0, bottom: 0 }} />
      <div aria-hidden="true" className="onboarding-hole" style={{ left: rect.left - 12, top: rect.top - 12, width: rect.width + 24, height: rect.height + 24 }} />
      <p className="onboarding-message"><strong>{title}</strong><span>{instruction}</span></p>
    </div>
  );
}
