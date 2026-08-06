"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

/**
 * False while rendering on the server and during the very first client render, true
 * afterwards.
 *
 * Components that decide what to show from stored data need this. Reading the store
 * directly is not enough: another component may have already pulled the data in, so the
 * first client render would draw something the server never sent and React would reject
 * the whole tree. Anchoring on the mount instead makes the two renders identical by
 * construction, whatever else on the page has already woken up.
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
