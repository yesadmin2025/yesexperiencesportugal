/**
 * Dev-only cache-busting full reload.
 *
 * Why: while iterating on Builder / Studio UI in the Lovable preview,
 * Vite occasionally returns a `full-reload` directive, but the browser
 * still serves stale assets (Service Worker cache, bfcache restore on
 * mobile Safari, or an in-flight module already evaluated). The user
 * then has to manually pull-to-refresh to see the edit.
 *
 * This installer:
 *  1. Hooks Vite's `vite:beforeFullReload` event, clears the Cache
 *     Storage API, and forces `location.reload()` so no stale chunk
 *     survives the reload.
 *  2. Listens to `pageshow` with `event.persisted === true` (bfcache
 *     restore — common on iOS Safari swipe-back) and reloads.
 *  3. Compares a build-time token in `<meta name="x-build-id">` (if
 *     present) against the last seen value in sessionStorage and
 *     reloads when it changes.
 *
 * Pure no-op on server, in production, and when `import.meta.hot` is
 * unavailable.
 */

const BUILD_KEY = "__yes_build_id__";

export function installDevHardReload() {
  if (typeof window === "undefined") return;
  if (!import.meta.env.DEV) return;

  // 1) Vite full-reload → purge caches, hard reload.
  if (import.meta.hot) {
    import.meta.hot.on("vite:beforeFullReload", () => {
      void purgeAndReload();
    });
  }

  // 2) bfcache restore → reload so latest JS evaluates.
  window.addEventListener("pageshow", (event) => {
    const pe = event as PageTransitionEvent;
    if (pe.persisted) {
      void purgeAndReload();
    }
  });

  // 3) Build-id drift detection (cheap, runs once per mount).
  try {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="x-build-id"]',
    );
    const current = meta?.content;
    if (current) {
      const previous = sessionStorage.getItem(BUILD_KEY);
      if (previous && previous !== current) {
        sessionStorage.setItem(BUILD_KEY, current);
        void purgeAndReload();
        return;
      }
      sessionStorage.setItem(BUILD_KEY, current);
    }
  } catch {
    /* sessionStorage may be unavailable in private mode — ignore */
  }
}

async function purgeAndReload() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* best-effort */
  }
  // Append a cache-bust query so any CDN/proxy in front of dev returns fresh.
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString(36));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}
