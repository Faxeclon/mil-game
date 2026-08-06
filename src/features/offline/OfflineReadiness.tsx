"use client";

import { useEffect } from "react";
import { registerServiceWorker, unregisterServiceWorkers } from "./registerServiceWorker";

/**
 * Registers the service worker once, as soon as the app is running in a browser.
 *
 * It renders nothing. Being offline-capable is not a feature a child should have to find
 * and switch on: for our players, no connection is the ordinary case, so the game
 * prepares for it the first time it is opened and never mentions it again.
 *
 * In development it does the opposite and clears any worker it finds. A cache built for
 * a production bundle will happily answer a development request with a stale chunk, and
 * the failure looks like a corrupt file rather than a stale cache - so the one place the
 * worker must never run is the machine where the code is being changed.
 */
export function OfflineReadiness() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      void registerServiceWorker();
      return;
    }
    void unregisterServiceWorkers();
  }, []);

  return null;
}
