/**
 * Iframe footer-jump guard.
 *
 * When the app is rendered inside an iframe (preview harnesses, embeds,
 * Lovable's own staging viewport), some host environments fire spurious
 * scroll events that land us at the very bottom of the document — which
 * lands the user on the footer and looks like a broken anchor click.
 *
 * This guard installs a passive scroll listener that, when running inside
 * an iframe, watches for "jump-to-footer" patterns and snaps the page
 * back to the top of its previous scroll position.
 *
 * What we consider a "footer jump":
 *   · scrollY lands within `bottomThreshold`px of the document bottom
 *   · AND the previous scrollY was less than `minDelta` away from the top
 *     of the next-to-last viewport (i.e. it's an instantaneous, large
 *     jump, not the user genuinely scrolling all the way down).
 *   · AND the jump was not user-initiated (no recent wheel/touch/key event).
 *
 * Pure no-op outside an iframe and on the server. Safe to install
 * unconditionally; it only acts when `window.self !== window.top`.
 *
 * Returns a dispose() to remove the listeners (used by tests + HMR).
 */

export interface IframeFooterGuardOptions {
  /** How close to the bottom counts as "at the footer" (px). */
  bottomThreshold?: number;
  /** Minimum vertical distance (px) for a jump to count as suspicious. */
  minJumpDelta?: number;
  /** How long after a real user input we trust scrolls (ms). */
  userInputWindowMs?: number;
}

export function isInIframe(
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): boolean {
  if (!win) return false;
  try {
    return win.self !== win.top;
  } catch {
    // Cross-origin access throws — that's only possible from inside an iframe.
    return true;
  }
}

export function installIframeFooterGuard(
  options: IframeFooterGuardOptions = {},
  win: Window = window,
): () => void {
  if (typeof window === "undefined") return () => {};
  if (!isInIframe(win)) return () => {};

  const { bottomThreshold = 120, minJumpDelta = 800, userInputWindowMs = 600 } = options;

  // -Infinity so we don't accidentally treat install-time as "recent
  // user input" under faked timers / SSR-like clocks where
  // performance.now() can be 0.
  let lastUserInputAt = -Infinity;
  let lastY = win.scrollY;
  let lastSafeY = win.scrollY;

  const markUserInput = () => {
    lastUserInputAt = performance.now();
  };

  const onScroll = () => {
    const y = win.scrollY;
    const doc = win.document.documentElement;
    const maxY = doc.scrollHeight - win.innerHeight;
    const nearBottom = maxY - y <= bottomThreshold;
    const jumped = Math.abs(y - lastY) >= minJumpDelta;
    const recentInput = performance.now() - lastUserInputAt < userInputWindowMs;

    if (nearBottom && jumped && !recentInput) {
      // Programmatic jump straight to the footer — bounce back to where we were.
      win.scrollTo({ top: lastSafeY, behavior: "auto" });
      return;
    }

    lastY = y;
    if (!nearBottom) lastSafeY = y;
  };

  const inputEvents: Array<keyof WindowEventMap> = [
    "wheel",
    "touchstart",
    "touchmove",
    "keydown",
    "pointerdown",
  ];

  inputEvents.forEach((evt) => win.addEventListener(evt, markUserInput, { passive: true }));
  win.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    inputEvents.forEach((evt) => win.removeEventListener(evt, markUserInput));
    win.removeEventListener("scroll", onScroll);
  };
}
