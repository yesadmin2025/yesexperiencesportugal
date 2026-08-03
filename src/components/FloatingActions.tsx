import { Link } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";
import { usePastHero } from "@/hooks/use-past-hero";

/**
 * FloatingActions
 *  - Subtle floating CTA ("Start Your Experience") on lg+ — appears only after
 *    the user has scrolled past the hero (~600px). The hero already carries two
 *    prominent CTAs, so a third floating one over the hero is visual noise; it
 *    earns its place once the user has signalled engagement by scrolling.
 *  - Scroll-to-top button — appears once the user has scrolled past ~600px.
 * Both are stacked in the bottom-right and stay out of the way on mobile,
 * sitting above the WhatsApp support FAB.
 *
 * A11y / interactivity gating:
 *   • The wrapper carries `aria-hidden` + `inert` whenever NOTHING inside is
 *     currently revealed (pre-scroll, both children are hidden), removing
 *     the entire subtree from the focus order, hit testing, and the
 *     accessibility tree in one pass.
 *   • Each child also keeps its own `tabIndex={-1}` and
 *     `pointer-events-none` while hidden as a defense-in-depth layer, so
 *     even legacy AT or a stray `inert` override can't reach them.
 */
export function FloatingActions() {
  // Shared post-hero visibility gate (threshold, persistence, BFCache
  // handling). No mediaQuery here: FloatingActions owns both the mobile
  // scroll-to-top arrow and the lg+ floating CTA, so the wrapper stays
  // mounted across breakpoints; per-child Tailwind classes handle the
  // breakpoint visibility.
  const pastHero = usePastHero({ threshold: 600 });

  const scrollTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  // When `pastHero` is false, BOTH children are hidden at every
  // breakpoint (the lg-only floating CTA is `hidden lg:inline-flex`, and
  // the scroll-to-top button is gated on `pastHero` too). So a single
  // wrapper-level `inert`/`aria-hidden` cleanly mirrors the visual state.
  const allHidden = !pastHero;

  return (
    <div
      // Stacked directly above the WhatsApp support FAB, which sits at
      // bottom `max(1rem, safe-area + 0.75rem)` and is 48px tall on mobile
      // / 56px from md up. 5.5rem (88px) clears it on phones; 6.5rem
      // (104px) clears the larger md+ FAB. Safe-area inset is folded into
      // the calc so iPhone home-indicator devices keep the same gap.
      className="fixed right-5 md:right-8 z-40 flex flex-col items-end gap-3 print:hidden bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))]"
      // Single source of truth for the hidden state — removes children
      // from focus, AT, and pointer hit-testing while pre-hero.
      aria-hidden={allHidden}
      inert={allHidden}
    >
      {/* Floating CTA — hidden below lg so mobile keeps a calm, single
          support affordance. On lg+ it fades in only after the user scrolls
          past the hero, so it never competes with the hero's own conversion
          anchors. Same 8px translate-up transition as the scroll-to-top
          button below for a unified reveal.


          tabIndex / pointer-events are also gated here as defense-in-depth
          on top of the wrapper-level `inert`. */}
      <Link
        to="/experience-studio"
        aria-label="Start your experience"
        tabIndex={pastHero ? 0 : -1}
        className={
          "hidden lg:inline-flex group items-center gap-2 rounded-full border border-[color:var(--teal)]/60 bg-[color:var(--ivory)]/95 backdrop-blur-md px-5 py-2.5 text-[12px] uppercase tracking-[0.18em] text-[color:var(--teal)] shadow-[0_8px_24px_-12px_rgba(41,91,97,0.35)] hover:-translate-y-0.5 hover:border-[color:var(--teal)] hover:bg-[color:var(--teal)] hover:text-[color:var(--ivory)] transition-all duration-500 " +
          (pastHero
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none")
        }
      >
        Start Your Experience
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-[color:var(--gold)] group-hover:bg-[color:var(--ivory)] transition-colors duration-500"
        />
      </Link>

      {/* Scroll to top */}
      <button
        type="button"
        onClick={scrollTop}
        aria-label="Scroll to top"
        tabIndex={pastHero ? 0 : -1}
        className={
          "inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--ivory)]/95 backdrop-blur-md text-[color:var(--charcoal)] shadow-[0_6px_18px_-10px_rgba(46,46,46,0.35)] transition-all duration-500 hover:-translate-y-0.5 hover:border-[color:var(--teal)]/60 hover:text-[color:var(--teal)] " +
          (pastHero
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none")
        }
      >
        <ArrowUp size={16} strokeWidth={1.6} />
      </button>
    </div>
  );
}
