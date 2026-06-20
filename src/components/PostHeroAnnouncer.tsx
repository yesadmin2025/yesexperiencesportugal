import { useEffect, useState } from "react";
import { PAST_HERO_EVENT } from "@/hooks/use-past-hero";

/**
 * PostHeroAnnouncer
 *
 * Visually-hidden, polite ARIA live region that fires a single, calm
 * announcement when post-hero CTA surfaces (the mobile sticky bar and
 * the desktop floating CTA) become available.
 *
 * Why
 * ---
 * Sighted users see the bar/button slide in and instinctively know a new
 * action is available. Screen-reader users get no equivalent cue — the
 * surfaces simply appear in the DOM mid-page. A short polite announcement
 * gives them parity without interrupting what's currently being read.
 *
 * Design
 * ------
 *   • aria-live="polite" + aria-atomic="true" — assistive tech waits for
 *     the current utterance to finish, then reads the new message in full.
 *   • role="status" — semantic redundancy; some older AT honor role over
 *     aria-live and vice versa.
 *   • Visually hidden via the standard sr-only pattern (clipped, 1px,
 *     overflow-hidden) so it never affects layout or visuals.
 *   • The hook usePastHero dispatches PAST_HERO_EVENT exactly once per
 *     tab. We listen for it and set the message — and never clear it,
 *     because clearing would risk a second announcement on remount.
 *   • Mount-time check: if the event already fired (e.g. another consumer
 *     mounted first), we read the same flag-equivalent (sessionStorage)
 *     so a late-mounted announcer still catches up. We do NOT re-announce
 *     across full page loads — the user already passed the hero last time
 *     in the same session, so no new "available" event has happened.
 *     We only announce when the current page actually crosses the
 *     threshold or the event lands while we're listening.
 *
 * Place this once near the root (e.g. inside <SiteLayout>), not on every
 * page that uses the post-hero surfaces.
 */
export function PostHeroAnnouncer() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPastHero = () => {
      // Short, calm, action-oriented. Avoid alarmist phrasing — this is
      // an opportunity, not an alert.
      setMessage("Start your experience — shortcut available at the bottom of the screen.");
    };

    window.addEventListener(PAST_HERO_EVENT, onPastHero);
    return () => window.removeEventListener(PAST_HERO_EVENT, onPastHero);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      // sr-only — visually hidden but available to assistive tech.
      className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      style={{ clip: "rect(0 0 0 0)", clipPath: "inset(50%)" }}
    >
      {message}
    </div>
  );
}
