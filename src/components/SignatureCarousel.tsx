import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/**
 * SignatureCarousel — premium horizontal swipe carousel for the
 * homepage Signature Journeys section.
 *
 * Mobile-first: native scroll-snap horizontal scroll with momentum;
 * cards are 84vw wide so the next card peeks at the right edge,
 * signalling "more to swipe". Desktop: 3 cards visible.
 *
 * Cinematic feel:
 *   - large editorial photography (4:5 aspect)
 *   - bottom-anchored gradient overlay for text legibility
 *   - active card lifts (1.0 opacity, slight scale) — neighbours dim
 *   - active card tracked via IntersectionObserver → tiny dot indicator
 *   - autoplay every 5.5s, looping back to start
 *   - autoplay pauses on hover, focus, touch, drag, tab-hidden,
 *     reduced-motion, and when the carousel is offscreen
 *
 * No heavy controls (no big arrows). A quiet pagination dot row sits
 * below the strip so the user always knows their position. The active
 * dot doubles as an autoplay progress bar so the motion feels
 * intentional, not random.
 */

type Item = {
  id: string;
  title: string;
  img: string;
  line: string;
  pace?: string[];
};

type Props = {
  items: Item[];
  /** Autoplay interval, ms. Default 5500ms (premium, unhurried pace). */
  autoplayMs?: number;
};

const DEFAULT_AUTOPLAY_MS = 5500;

export function SignatureCarousel({ items, autoplayMs = DEFAULT_AUTOPLAY_MS }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Pause flags — autoplay only runs when ALL of these are false.
  const [paused, setPaused] = useState({
    hover: false,
    focus: false,
    touch: false,
    offscreen: true, // start paused until the strip enters the viewport
    hidden: typeof document !== "undefined" ? document.hidden : false,
  });
  const isPaused = Object.values(paused).some(Boolean);

  // Reduced-motion → disable autoplay entirely. Read once on mount; the
  // user can flip the preference and reload, which matches platform UX
  // conventions and avoids surprise autoplay if they change their mind
  // mid-session.
  //
  // Mobile (<lg / <1024px) → also disable autoplay. Per audit M2:
  // automatic horizontal scroll on phones competes with vertical page
  // scrolling and reads as "jumpy". On mobile the carousel only moves
  // by user swipe.
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqMobile = window.matchMedia("(max-width: 1023.98px)");
    setReduceMotion(mqReduce.matches);
    setIsMobile(mqMobile.matches);
    const onReduce = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    const onMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mqReduce.addEventListener?.("change", onReduce);
    mqMobile.addEventListener?.("change", onMobile);
    return () => {
      mqReduce.removeEventListener?.("change", onReduce);
      mqMobile.removeEventListener?.("change", onMobile);
    };
  }, []);
  const autoplayDisabled = reduceMotion || isMobile;

  // ── Active-card tracking via scroll position ────────────────────────────
  // We use a rAF-throttled scroll listener instead of IntersectionObserver
  // so the dot indicator updates smoothly during the autoplay scroll
  // (IO ratios can lag behind native smooth-scroll on mobile).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;

    const tick = () => {
      raf = 0;
      const cards = Array.from(track.querySelectorAll<HTMLElement>("[data-carousel-card]"));
      if (cards.length === 0) return;
      const trackCenter = track.scrollLeft + track.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      cards.forEach((c, i) => {
        const center = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.abs(center - trackCenter);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      setActiveIndex(bestIdx);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };

    tick();
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items.length]);

  const scrollToIndex = useCallback((idx: number, opts: { smooth?: boolean } = {}) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.querySelectorAll<HTMLElement>("[data-carousel-card]");
    const target = cards[idx];
    if (!target) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = opts.smooth === false || reduce ? "auto" : "smooth";
    // Use scrollTo on the track rather than scrollIntoView, which on
    // some mobile browsers also scrolls the page vertically.
    track.scrollTo({
      left: target.offsetLeft,
      behavior,
    });
  }, []);

  // ── Pause-state listeners (hover, focus, touch, visibility, viewport) ──
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const setFlag = (k: keyof typeof paused, v: boolean) =>
      setPaused((p) => (p[k] === v ? p : { ...p, [k]: v }));

    const onEnter = () => setFlag("hover", true);
    const onLeave = () => setFlag("hover", false);
    const onFocusIn = () => setFlag("focus", true);
    const onFocusOut = () => setFlag("focus", false);
    const onTouchStart = () => setFlag("touch", true);
    // Resume a beat after touch ends so the user has a moment to land.
    const onTouchEnd = () => {
      window.setTimeout(() => setFlag("touch", false), 1200);
    };
    const onVisibility = () => setFlag("hidden", document.hidden);

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    // Pause when carousel is offscreen.
    const io = new IntersectionObserver(([entry]) => setFlag("offscreen", !entry.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(root);

    return () => {
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);

  // ── Autoplay loop ───────────────────────────────────────────────────────
  // Progress (0 → 1) is exposed as a CSS var on the active dot so it
  // doubles as a subtle progress bar — the motion feels intentional.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (autoplayDisabled || isPaused || items.length <= 1) {
      setProgress(0);
      return;
    }
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / autoplayMs);
      setProgress(p);
      if (p >= 1) {
        const next = (activeIndex + 1) % items.length;
        scrollToIndex(next);
        start = now; // reset ramp; the new active index will arrive via scroll observer
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setProgress(0);
    };
  }, [autoplayDisabled, isPaused, activeIndex, items.length, autoplayMs, scrollToIndex]);

  return (
    <div className="relative" ref={rootRef}>
      {/* Track — native horizontal scroll, snap-mandatory.
          Padding-x equals the container gutter so the first card aligns
          to the column, and `scroll-padding` keeps the snap target on
          the same gutter line. overscroll-contain stops the page from
          rubber-banding when the user swipes past the last card. */}
      <div
        ref={trackRef}
        className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-proximity scroll-smooth pb-2 -mx-5 px-5 md:-mx-8 md:px-8 overscroll-x-contain [contain:layout_paint] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollPaddingLeft: "1.25rem" }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Signature Journeys"
      >
        {items.map((s, i) => {
          const isActive = i === activeIndex;
          return (
            <article
              key={s.id}
              data-carousel-card
              data-active={isActive ? "true" : "false"}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}: ${s.title}`}
              className="snap-start shrink-0 basis-[84%] sm:basis-[58%] lg:basis-[31%] group transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] data-[active=false]:opacity-70 data-[active=true]:opacity-100"
            >
              <Link
                to="/tours/$tourId"
                params={{ tourId: s.id }}
                className="editorial-card block relative overflow-hidden aspect-[4/5] border border-[color:var(--border)] transition-[transform,box-shadow] duration-[600ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-data-[active=true]:shadow-[0_28px_56px_-24px_rgba(0,0,0,0.55)] active:scale-[0.995]"
                aria-label={`Open journey — ${s.title}`}
              >
                <img
                  src={s.img}
                  alt={s.title}
                  loading="lazy"
                  data-card-image
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-data-[active=true]:scale-[1.04] group-hover:scale-[1.05]"
                />
                {/* Cinematic bottom-anchored wash. Top kept light so the
                    photography breathes; bottom carries the legibility. */}
                <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal-deep)]/90 via-[color:var(--charcoal-deep)]/35 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(15,15,15,0.35)_100%)]" />

                {/* Top-left pace eyebrow — sets pace before the title. */}
                {s.pace && s.pace[0] && (
                  <span className="absolute top-4 left-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold-soft)]">
                    <span className="block h-px w-5 bg-[color:var(--gold)]/80" />
                    {s.pace[0]}
                  </span>
                )}

                {/* Bottom content stack — title, teaser, micro CTA. */}
                <div className="absolute inset-x-5 bottom-5 md:inset-x-7 md:bottom-7 text-[color:var(--ivory)]">
                  <h3 className="serif text-[1.6rem] md:text-[1.85rem] leading-[1.1] tracking-[-0.005em] drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)]">
                    {s.title.split(" — ")[0]}
                  </h3>
                  <p className="mt-3 text-[13.5px] md:text-[14.5px] italic font-light leading-[1.55] text-[color:var(--ivory)]/90 max-w-[34ch]">
                    {s.line}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] font-medium text-[color:var(--gold-soft)] group-hover:text-[color:var(--gold)] transition-colors">
                    Discover
                    <ArrowRight
                      size={13}
                      className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                    />
                  </span>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {/* Pagination dots — the active dot doubles as an autoplay
          progress bar via the --p CSS var. */}
      <div
        className="mt-6 flex justify-center items-center gap-2"
        role="tablist"
        aria-label="Carousel pagination"
      >
        {items.map((s, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              onClick={() => scrollToIndex(i)}
              className="relative inline-flex items-center justify-center w-9 h-9 -mx-1 group/dot"
            >
              {isActive ? (
                <span
                  aria-hidden="true"
                  className="relative block w-7 h-1.5 rounded-full overflow-hidden bg-[color:var(--charcoal)]/15"
                >
                  <span
                    className="absolute inset-y-0 left-0 bg-[color:var(--gold)] rounded-full transition-[width] duration-100 ease-linear"
                    style={{
                      width: `${Math.max(8, Math.round(progress * 100))}%`,
                    }}
                  />
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="block w-1.5 h-1.5 rounded-full bg-[color:var(--charcoal)]/25 transition-colors duration-300 group-hover/dot:bg-[color:var(--charcoal)]/55"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
