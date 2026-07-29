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

const SCRIPT_ID = "yes-trustindex-loader";
const CONSENT_KEY = "yes.cookieConsent.v1";

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

export function TrustindexWidget() {
  const anchorRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    if (document.getElementById(SCRIPT_ID)) return;

    let done = false;
    const inject = () => {
      if (done) return;
      done = true;
      if (document.getElementById(SCRIPT_ID)) return;
      if (!consentAllows()) return;

      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = TRUSTINDEX_LOADER_SRC;
      s.defer = true;
      s.async = true;
      s.setAttribute("data-yes-trust", "certificate");
      // A vendor outage must never surface to the guest — the static seal
      // in the footer already carries the trust signal.
      s.onerror = () => s.remove();
      document.body.appendChild(s);
    };

    if (typeof IntersectionObserver !== "function") {
      inject();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          inject();
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Zero-height anchor: purely the intersection target, never reserves space.
  return <div ref={anchorRef} aria-hidden="true" data-trustindex-anchor="" className="h-0 w-0" />;
}
