/**
 * TrustindexWidget — loads the official Trustindex certificate loader.
 *
 * Why this exists: Trustindex only registers a domain under "Widget
 * appearances" when its own `loader-cert.js` runs on the page. Our static
 * `TrustindexBadge` is a faithful replica with zero third-party JS, but it can
 * never satisfy that verification — so we run the vendor script too.
 *
 * Guardrails, in order of importance:
 *   • Lazy — the script is only injected once the footer enters the viewport,
 *     so it never competes with LCP.
 *   • Consent-aware — skipped when the guest explicitly denied analytics
 *     storage in the cookie banner.
 *   • Layout-safe — the vendor injects a *fixed* floating certificate. It is
 *     styled (see `.ti-*` rules in styles.css) to sit discreetly above the
 *     safe area on desktop and to stay hidden on mobile, where the sticky
 *     booking CTA owns that corner. The visible footer seal is always our own
 *     static badge, so nothing shifts and nothing collides.
 *   • Idempotent — mounted once per document, even across route changes.
 */

import * as React from "react";
import { TRUSTINDEX_LOADER_SRC } from "@/config/trust-certificate";
import { reportClientError } from "@/lib/client-error-logger";

const SCRIPT_ID = "yes-trustindex-loader";
const CONSENT_KEY = "yes.cookieConsent.v1";
/** How long the vendor gets to paint its certificate before we call it a miss. */
const RENDER_TIMEOUT_MS = 8000;

/** True unless the guest explicitly denied analytics storage. */
function consentAllows(): boolean {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { analytics?: string };
    return parsed.analytics !== "denied";
  } catch {
    return true;
  }
}

/** Any node the Trustindex loader injects once it renders the certificate. */
function widgetRendered(): boolean {
  return Boolean(
    document.querySelector(
      "[class*='ti-widget'],[id*='trustindex'],.ti-widget-container,#ti-widget-container",
    ),
  );
}

function monitor(
  status: "loaded" | "failed" | "rendered" | "render-missing" | "blocked-consent",
  extra?: Record<string, unknown>,
) {
  const failed = status === "failed" || status === "render-missing";
  void reportClientError({
    message: `Trustindex loader: ${status}`,
    source: TRUSTINDEX_LOADER_SRC,
    severity: failed ? "warning" : "info",
    metadata: { monitor: "trustindex", status, ...extra },
  });
}

export function TrustindexWidget() {
  const anchorRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    if (document.getElementById(SCRIPT_ID)) return;

    let done = false;
    let renderTimer: ReturnType<typeof setTimeout> | undefined;

    const checkRender = (startedAt: number) => {
      if (widgetRendered()) {
        monitor("rendered", { msToRender: Math.round(performance.now() - startedAt) });
        return;
      }
      monitor("render-missing", { waitedMs: RENDER_TIMEOUT_MS });
    };

    const inject = () => {
      if (done) return;
      done = true;
      if (document.getElementById(SCRIPT_ID)) return;
      if (!consentAllows()) {
        monitor("blocked-consent");
        return;
      }

      const startedAt = performance.now();
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = TRUSTINDEX_LOADER_SRC;
      s.defer = true;
      s.async = true;
      s.setAttribute("data-yes-trust", "certificate");
      s.onload = () => {
        monitor("loaded", { msToLoad: Math.round(performance.now() - startedAt) });
        renderTimer = setTimeout(() => checkRender(startedAt), RENDER_TIMEOUT_MS);
      };
      // A vendor outage must never surface to the guest — the static seal
      // in the footer already carries the trust signal. We only log it.
      s.onerror = () => {
        monitor("failed", { msToFail: Math.round(performance.now() - startedAt) });
        s.remove();
      };
      document.body.appendChild(s);
    };

    // Batch 4: once the footer is near, still wait for a genuinely idle
    // moment (or a hard cap) so the vendor script never shares the main
    // thread with interaction readiness on a slow device.
    let idleHandle: number | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const injectWhenIdle = () => {
      const ric = (window as unknown as { requestIdleCallback?: typeof requestIdleCallback })
        .requestIdleCallback;
      if (typeof ric === "function") {
        idleHandle = ric(() => inject(), { timeout: 3000 }) as unknown as number;
        return;
      }
      idleTimer = setTimeout(inject, 1200);
    };

    const cleanupIdle = () => {
      const cic = (window as unknown as { cancelIdleCallback?: typeof cancelIdleCallback })
        .cancelIdleCallback;
      if (idleHandle !== undefined && typeof cic === "function") cic(idleHandle);
      if (idleTimer) clearTimeout(idleTimer);
    };

    if (typeof IntersectionObserver !== "function") {
      injectWhenIdle();
      return () => {
        cleanupIdle();
        if (renderTimer) clearTimeout(renderTimer);
      };
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          injectWhenIdle();
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cleanupIdle();
      if (renderTimer) clearTimeout(renderTimer);
    };
  }, []);


  // Zero-height anchor: purely the intersection target, never reserves space.
  return <div ref={anchorRef} aria-hidden="true" data-trustindex-anchor="" className="h-0 w-0" />;
}
