/*
 * Kikiria service worker.
 *
 * The point of this file is one sentence: after the first visit, the game opens with no
 * connection at all. Our players have a phone far more often than they have internet, so
 * needing a signal to start would fail exactly the children the project is for.
 *
 * Everything is cached as it is used rather than from a build manifest. That keeps the
 * worker independent of how Next names its files, and means a child who played once has
 * everything they touched already stored on the device.
 */

const CACHE_VERSION = "kikiria-v1";
const OFFLINE_FALLBACK = "/es";

/** Files that must be there for the very first offline start, before anything is played. */
const ESSENTIAL = ["/es", "/en", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // One missing entry must not abort the whole install, so each is added on its own.
      .then((cache) => Promise.allSettled(ESSENTIAL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isCacheable(request, url) {
  return (
    request.method === "GET" &&
    url.origin === self.location.origin &&
    // A partial response cannot be replayed from the cache as a whole file.
    !request.headers.has("range")
  );
}

async function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type === "opaque") return;
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response.clone());
}

/**
 * Pages go to the network first so a returning player sees the newest build, and fall
 * back to whatever was stored when there is no signal.
 */
/** Falls back to the home page of the language being browsed, not always to Spanish. */
function getFallbackFor(url) {
  const locale = url.pathname.split("/")[1];
  return locale === "en" ? "/en" : OFFLINE_FALLBACK;
}

async function handlePage(request) {
  try {
    const response = await fetch(request);
    await putInCache(request, response);
    return response;
  } catch {
    const cached =
      (await caches.match(request)) ?? (await caches.match(getFallbackFor(new URL(request.url))));
    if (cached) return cached;
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

/**
 * Everything else - scripts, styles, images - is served from the cache first. These are
 * content-hashed by the build, so a stored copy is never stale, and answering from disk
 * is what makes the game usable on a slow or absent connection.
 */
async function handleAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await putInCache(request, response);
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!isCacheable(event.request, url)) return;

  event.respondWith(event.request.mode === "navigate" ? handlePage(event.request) : handleAsset(event.request));
});
