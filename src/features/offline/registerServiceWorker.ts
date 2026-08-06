/**
 * Turning the game into something that opens without a signal.
 *
 * Registration is deliberately best-effort: an old browser, a private window or a device
 * that refuses to register must all keep playing exactly as before. Nothing here is
 * allowed to interrupt a child who just opened the app.
 */
export const SERVICE_WORKER_URL = "/sw.js";

export function canRegisterServiceWorker(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export async function registerServiceWorker(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" || !canRegisterServiceWorker()) return false;
  try {
    await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes every worker registered for this origin, and the caches they were serving.
 *
 * A worker outlives the build that installed it: one registered by a production run
 * keeps answering requests on the same host afterwards, which in development means
 * yesterday's chunks served against today's code. Clearing it is how that machine
 * recovers without anybody having to know what a service worker is.
 */
export async function unregisterServiceWorkers(): Promise<number> {
  if (!canRegisterServiceWorker()) return 0;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const ours = registrations.filter((registration) => registration.active?.scriptURL.endsWith(SERVICE_WORKER_URL));
    await Promise.all(ours.map((registration) => registration.unregister()));

    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("kikiria-")).map((key) => caches.delete(key)));
    }
    return ours.length;
  } catch {
    return 0;
  }
}

/**
 * Asks the browser not to evict what is stored here.
 *
 * The 5 MB limit is not the danger: the saved progress weighs about two kilobytes. The
 * danger is that a full 32 GB phone lets the browser clear the whole origin at once, and
 * a child who did not play for three weeks would lose every medal.
 *
 * It is a request, not a guarantee. The browser grants it based on how much the app is
 * used and whether it was installed, which is a second reason for the PWA.
 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return null;
  try {
    const alreadyPersisted =
      typeof navigator.storage.persisted === "function" ? await navigator.storage.persisted() : false;
    if (alreadyPersisted) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
