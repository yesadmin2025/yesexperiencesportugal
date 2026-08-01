import { useEffect, useState } from "react";

/**
 * Shared single source-of-truth for "the user has scrolled past the hero
 * and our post-hero CTA surfaces should now be available".
 *
 * <FloatingActions> consumes this hook so the
 * threshold, persistence, BFCache handling, and reveal moment stay in
 * lockstep. Change it once here and every post-hero surface follows.
 *
 * Behavior
 * --------
 * • Returns true once `window.scrollY` exceeds `threshold` (default 600px).
 * • Persists the "passed hero" flag in sessionStorage so that on back/
 *   forward navigation or a BFCache restore the user is still considered
 *   past the hero — they've already proven they're engaged in this session.
 * • Re-evaluates on `pageshow` (fires for both initial load and BFCache
 *   restores).
 * • SSR-safe: starts `false` on the server; hydrates to the real value
 *   after mount so the first server-rendered HTML matches the client.
 */

const STORAGE_KEY = "yes:passedHero";

export type UsePastHeroOptions = {
  /** Scroll threshold in px. Default 600. */
  threshold?: number;
  /**
   * Optional media query that must match for the hook to ever return true.
   * Useful for surfaces that only activate at a given breakpoint.
   * Default: undefined (always active).
   */
  mediaQuery?: string;
  /**
   * Idle window in ms after the last scroll event before the hook is
   * allowed to flip to `true`. While the user is actively scrolling the
   * surface stays hidden (or hides if it was already showing) so it
   * never competes with motion. The bar fades in only once the user has
   * stopped to read. Default 220ms — long enough to feel intentional,
   * short enough to feel responsive. Set to 0 to disable.
   */
  scrollIdleMs?: number;
};

function readPersisted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markPersisted() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* storage may be blocked — fail silently */
  }
}

/**
 * Module-scoped guard so the `yes:past_hero` event is dispatched at most
 * once per tab (across multiple consumers and across re-renders).
 */
let didAnnouncePastHero = false;

function dispatchPastHeroOnce() {
  if (typeof window === "undefined" || didAnnouncePastHero) return;
  didAnnouncePastHero = true;
  try {
    window.dispatchEvent(new CustomEvent(PAST_HERO_EVENT));
  } catch {
    /* noop */
  }
}

export function usePastHero({
  threshold = 600,
  mediaQuery,
  scrollIdleMs = 220,
}: UsePastHeroOptions = {}) {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = mediaQuery ? window.matchMedia(mediaQuery) : null;
    let idleTimer: number | undefined;

    /**
     * Compute the "would be visible" state from current conditions only.
     * Hard rules:
     *  • Media-query gate must match.
     *  • Current scrollY MUST be past the threshold. The persisted
     *    sessionStorage flag is used ONLY as a tiebreaker between equally
     *    qualifying moments (e.g. BFCache restore at scrollY > threshold);
     *    it is never enough on its own. This guarantees the bar can never
     *    appear while the user is still inside the hero, even on a fresh
     *    page load where they previously visited the site.
     */
    const qualifies = () => {
      if (mq && !mq.matches) return false;
      return window.scrollY > threshold;
    };

    /** Apply the resting (scroll-idle) visibility decision. */
    const settle = () => {
      if (qualifies()) {
        markPersisted();
        dispatchPastHeroOnce();
        setPastHero(true);
      } else {
        // Either we're back inside the hero, or the breakpoint changed,
        // or storage said we'd been past before but scroll says otherwise.
        // The current frame wins — never reveal over the hero.
        setPastHero(false);
      }
    };

    const onScroll = () => {
      // Always hide immediately while scrolling — competing with motion
      // looks cheap. setState is a no-op if already false.
      setPastHero((prev) => (prev ? false : prev));
      if (idleTimer !== undefined) {
        window.clearTimeout(idleTimer);
        idleTimer = undefined;
      }
      // If we're currently inside the hero (or the breakpoint excludes
      // us), there is nothing to reveal — skip scheduling settle entirely.
      // This guarantees the bar can never appear when the user scrolls
      // back up into the hero and stops there: no timer, no reveal.
      if (!qualifies()) return;
      // Otherwise wait for scroll to stop before considering reveal.
      idleTimer = window.setTimeout(settle, scrollIdleMs);
    };

    // pageshow fires on initial load AND on BFCache restores. Treat it
    // like the first frame: settle immediately, no debounce — the page
    // isn't moving.
    const onPageShow = () => {
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      settle();
    };

    const onMqChange = () => {
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      settle();
    };

    // Initial paint: respect the same "must currently qualify" rule, so
    // a fresh load at the top of the page never flashes the bar.
    settle();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pageshow", onPageShow);
    mq?.addEventListener?.("change", onMqChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pageshow", onPageShow);
      mq?.removeEventListener?.("change", onMqChange);
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
    };
  }, [threshold, mediaQuery, scrollIdleMs]);

  return pastHero;
}
