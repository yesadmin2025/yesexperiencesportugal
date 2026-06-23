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
const INSTALL_KEY = "__yes_dev_hard_reload_installed__";

declare global {
  interface Window {
    __yes_dev_hard_reload_installed__?: boolean;
  }
}

export function installDevHardReload() {
  if (typeof window === "undefined") return;
  if (!import.meta.env.DEV) return;
  if (window[INSTALL_KEY]) return;
  // Skip inside automated browsers (Playwright/Selenium) — the reload loop
  // tears down React state mid-test and produces flaky failures.
  if (typeof navigator !== "undefined" && navigator.webdriver) return;
  // Allow explicit opt-out via query (`?e2e=1`).
  try {
    if (new URL(window.location.href).searchParams.has("e2e")) return;
  } catch {
    /* ignore */
  }
  window[INSTALL_KEY] = true;

  // 1) Vite full-reload → purge caches, hard reload.
  if (import.meta.hot) {
    import.meta.hot.on("vite:beforeFullReload", () => {
      void purgeAndReload();
    });
  }

  // Lovable's mobile preview can proxy HTTP correctly while Vite's websocket
  // HMR fails. In that case `import.meta.hot` never receives the reload event,
  // so poll the local HMR gate and flush pending edits ourselves.
  window.setInterval(() => {
    void flushGateIfPending();
  }, 1800);

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

async function flushGateIfPending() {
  try {
    const gate = await fetch("/__hmr_gate", { cache: "no-store" });
    if (!gate.ok) return;
    const payload = (await gate.json()) as { count?: number };
    if (!payload.count || payload.count < 1) return;

    await fetch("/__hmr_flush", { method: "POST", cache: "no-store" }).catch(() => null);
    await purgeAndReload();
  } catch {
    /* The endpoint only exists in preview/dev — ignore elsewhere. */
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
