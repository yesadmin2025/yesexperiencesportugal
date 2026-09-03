/*
 * YES Experiences — minimal, conservative service worker.
 *
 * Purpose: make the site installable as a real app on Android and iOS and give
 * an honest offline screen. It deliberately does NOT cache HTML documents,
 * API calls, Stripe, Supabase or anything price/availability related, so a
 * booked day is always composed from live truth.
 */

const VERSION = "yes-v1";
const OFFLINE_URL = "/offline.html";
const STATIC_CACHE = `${VERSION}-static`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png", "/apple-touch-icon.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Documents: always network. Offline → honest offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Never cache anything dynamic or transactional.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn")) return;

  // Immutable build assets and images: cache-first, refreshed in the background.
  if (/\.(?:js|css|woff2?|png|jpe?g|svg|webp|avif|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
