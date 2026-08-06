/* Advance CACHE_VERSION when changing the offline contract. Old kikiria-* caches are
   removed on activation; unrelated applications on this origin are never touched. */
const CACHE_VERSION = "v2";
const CACHE_PREFIX = "kikiria-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const NAVIGATION_CACHE = `${CACHE_PREFIX}pages-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`;
const PUBLIC_CACHE = `${CACHE_PREFIX}public-${CACHE_VERSION}`;
const EXPECTED_CACHES = [SHELL_CACHE, NAVIGATION_CACHE, STATIC_CACHE, PUBLIC_CACHE];
const PRECACHE = ["/offline.html", "/es", "/en", "/manifest.webmanifest"];
const LIMITS = { pages: 25, static: 100, public: 50 };

function isBypassed(request, url) {
  const accept = request.headers.get("accept") || "";
  return request.method !== "GET" || url.origin !== self.location.origin || url.protocol !== "https:" && url.protocol !== "http:" ||
    request.headers.has("range") || url.searchParams.has("_rsc") || request.headers.has("rsc") ||
    request.headers.has("next-router-prefetch") || request.headers.has("next-router-state-tree") ||
    accept.includes("text/x-component") || url.pathname.startsWith("/_next/webpack-hmr") || url.pathname.startsWith("/api/");
}

function isHtml(response) {
  return response && response.status === 200 && response.type === "basic" && !response.redirected &&
    (response.headers.get("content-type") || "").includes("text/html");
}

function isCacheableAsset(response) {
  return response && response.status === 200 && response.type === "basic" && !response.redirected;
}

async function putBounded(cacheName, request, response, limit) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    // Cache Storage exposes insertion order, so this is a small approximate FIFO bound.
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)));
  } catch { /* Offline caching is best effort. */ }
}

function localeHome(url) {
  return url.pathname.split("/")[1] === "en" ? "/en" : "/es";
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (isHtml(response)) void putBounded(NAVIGATION_CACHE, request, response, LIMITS.pages);
    return response;
  } catch {
    const pages = await caches.open(NAVIGATION_CACHE);
    const exact = await pages.match(request);
    if (exact) return exact;
    const shell = await caches.open(SHELL_CACHE);
    return (await shell.match(localeHome(new URL(request.url)))) || (await shell.match("/offline.html")) ||
      new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function handleAsset(request, cacheName, limit, cacheFirst) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cacheFirst && cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheableAsset(response)) void putBounded(cacheName, request, response, limit);
    return response;
  } catch {
    return cached || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

/** The manifest is part of the small shell, so a browser can still read it offline. */
async function handleManifest(request) {
  const shell = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheableAsset(response)) {
      try { await shell.put(request, response.clone()); } catch { /* Keep the existing shell. */ }
    }
    return response;
  } catch {
    return (await shell.match(request)) || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
    // This worker activates after existing tabs close; no forced takeover or reload loop.
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && !EXPECTED_CACHES.includes(name)).map((name) => caches.delete(name)));
  })());
});

self.addEventListener("fetch", (event) => {
  let url;
  try { url = new URL(event.request.url); } catch { return; }
  if (isBypassed(event.request, url)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigation(event.request));
  } else if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(handleManifest(event.request));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(handleAsset(event.request, STATIC_CACHE, LIMITS.static, true));
  } else if (/^\/(?:icons\/|media\/|manifest\.webmanifest$)/.test(url.pathname) && !url.pathname.endsWith(".map")) {
    event.respondWith(handleAsset(event.request, PUBLIC_CACHE, LIMITS.public, false));
  }
});
