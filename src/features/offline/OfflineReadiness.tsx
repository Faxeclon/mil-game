"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "./registerServiceWorker";

/**
 * Registers the service worker once, as soon as the app is running in a browser.
 *
 * It renders nothing. Being offline-capable is not a feature a child should have to find
 * and switch on: for our players, no connection is the ordinary case, so the game
 * prepares for it the first time it is opened and never mentions it again.
 */
export function OfflineReadiness() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return null;
}
