"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  try {
    return window.matchMedia(QUERY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  const query = getMediaQuery();
  if (!query) return () => {};
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the device asks for less movement.
 *
 * The setting is honoured in CSS everywhere; this only lets the accessibility screen
 * report the truth back to the player instead of offering a switch the game does not own.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getMediaQuery()?.matches === true,
    // Nothing is known about the device while rendering on the server.
    () => false
  );
}
