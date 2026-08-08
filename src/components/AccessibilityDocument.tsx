"use client";

import { useEffect } from "react";
import { useAccessibility } from "@/features/accessibility/accessibilityStore";

/**
 * Carries the accessibility choices to the document, where the stylesheet can see them.
 *
 * Two of the settings change how every page looks rather than how one component behaves,
 * so they are applied once here instead of threaded through every screen. It renders
 * nothing: the only output is a pair of attributes on the root element.
 */
export function AccessibilityDocument() {
  const { clearReading, reducedMotion, largerText } = useAccessibility();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.clearReading = clearReading ? "on" : "off";
    root.dataset.reducedMotion = reducedMotion ? "on" : "off";
    root.dataset.largerText = largerText ? "on" : "off";
  }, [clearReading, reducedMotion, largerText]);

  return null;
}
