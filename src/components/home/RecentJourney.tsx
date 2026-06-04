import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { SectionTitle } from "@/components/ui/SectionTitle";

// Pages from a real, anonymized private travel file we delivered.
import pageCover from "@/assets/travel-file/cover.jpg";
import pageRoute from "@/assets/travel-file/route.jpg";
import pageReservations from "@/assets/travel-file/reservations.jpg";
import pageDay from "@/assets/travel-file/day.jpg";
import pageAccommodations from "@/assets/travel-file/accommodations.jpg";

/**
 * Bespoke Travel Designer — proof block.
 *
 * Typography v3: Montserrat headings + Georgia italic emphasis only on
 * the focal phrase. Proof = a real delivered travel file rendered as a
 * flip-through book. Mobile swipes; desktop turns pages from the spine
 * with 3D perspective; both modes share keyboard nav (← →, Home, End),
 * a clickable thumbnail rail, aria-live page announcements, and
 * eager preloading of adjacent pages so each flip is instant. All
 * motion collapses to a fade when prefers-reduced-motion is set.
 */

const PAGES = [
  { src: pageCover, label: "Cover", alt: "Cover of a private travel file — Portugal, Beyond the Postcards" },
  { src: pageRoute, label: "Route", alt: "The route — a hand-designed multi-region itinerary across Portugal" },
  { src: pageReservations, label: "Reservations", alt: "Confirmed reservations — every overnight reserved before departure" },
  { src: pageDay, label: "A day", alt: "A day in the file — morning, lunch, afternoon, sunset, evening" },
  { src: pageAccommodations, label: "Stays", alt: "Where you stay — properties chosen to deepen each region" },
] as const;

const PILLARS = [
  {
    label: "Designed with you",
    body: "It begins with a conversation — your pace, your taste, the Portugal you want to feel.",
  },
  {
    label: "Written by a local",
    body: "A travel designer on the ground, shaping a story only someone from here would draw.",
  },
  {
    label: "Delivered as a book",
    body: "Your journey arrives as a private travel file: route, days, properties — all confirmed.",
  },
] as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);
  return reduced;
}

/**
 * Tracks which page src has finished decoding. Used to swap the
 * shimmer skeleton out for the real image, so the book never shows
 * a half-painted page during a flip.
 */
function useImageLoader(srcs: readonly string[]) {
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    let cancelled = false;
    // Eagerly decode every page once mounted — five 200KB JPEGs total,
    // small enough to make flips instantaneous. Honours image-decode
    // priority via the native <img> decode() API.
    srcs.forEach((src) => {
      const img = new Image();
      img.src = src;
      img
        .decode?.()
        .then(() => {
          if (!cancelled) {
            setLoaded((prev) => {
              if (prev.has(src)) return prev;
              const next = new Set(prev);
              next.add(src);
              return next;
            });
          }
        })
        .catch(() => {
          // decode() can reject on some browsers; fall back to onload.
          img.onload = () => {
            if (!cancelled) {
              setLoaded((prev) => {
                if (prev.has(src)) return prev;
                const next = new Set(prev);
                next.add(src);
                return next;
              });
            }
          };
        });
    });
    return () => {
      cancelled = true;
    };
  }, [srcs]);
  return loaded;
}

function PageSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden rounded-[3px] bg-[color:var(--sand)]"
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "linear-gradient(110deg, color-mix(in oklab, var(--sand) 95%, transparent) 30%, color-mix(in oklab, var(--ivory) 95%, transparent) 50%, color-mix(in oklab, var(--sand) 95%, transparent) 70%)",
          backgroundSize: "200% 100%",
          animation: "rj-shimmer 1.6s ease-in-out infinite",
        }}
      />
      <style>{`@keyframes rj-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  );
}

function BookFlip() {
  const [index, setIndex] = useState(0);
  const [flipDir, setFlipDir] = useState<"next" | "prev" | null>(null);
  const reduced = usePrefersReducedMotion();
  const touchStartX = useRef<number | null>(null);
  const flipping = useRef(false);

  const srcs = useMemo(() => PAGES.map((p) => p.src), []);
  const loaded = useImageLoader(srcs);

  const total = PAGES.length;

  const goTo = (target: number) => {
    if (flipping.current) return;
    if (target < 0 || target >= total || target === index) return;
    const dir: "next" | "prev" = target > index ? "next" : "prev";
    if (reduced) {
      setIndex(target);
      return;
    }
    flipping.current = true;
    setFlipDir(dir);
    window.setTimeout(() => {
      setIndex(target);
      setFlipDir(null);
      flipping.current = false;
    }, 620);
  };

  const go = (dir: "next" | "prev") => goTo(dir === "next" ? index + 1 : index - 1);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    go(dx < 0 ? "next" : "prev");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      go("next");
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      go("prev");
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(total - 1);
    }
  };

  const current = PAGES[index];
  const incoming =
    flipDir === "next" ? PAGES[index + 1] : flipDir === "prev" ? PAGES[index - 1] : null;
  const currentLoaded = loaded.has(current.src);

  return (
    <div className="reveal mx-auto max-w-3xl">
      {/* Screen-reader page announcer */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Page {index + 1} of {total}: {current.label}
      </p>

      {/* Book stage */}
      <div
        role="group"
        aria-roledescription="book"
        aria-label="Pages from a real private travel file. Use arrow keys, swipe, or the thumbnails below to turn pages."
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative mx-auto outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--ivory)] rounded-[2px] px-6 md:px-8"
        style={{ perspective: "2200px", width: "min(100%, 360px)" }}
      >
        {/* Soft cast shadow under the book */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -bottom-5 h-8 rounded-[50%] bg-[color:var(--charcoal)]/25 blur-2xl opacity-60"
        />

        <div className="relative aspect-[3/4] w-full" style={{ transformStyle: "preserve-3d" }}>
          {/* Skeleton (only while the very first page is still decoding) */}
          {!currentLoaded && !incoming ? <PageSkeleton /> : null}

          {/* Static back page (revealed mid-flip) */}
          {incoming ? (
            loaded.has(incoming.src) ? (
              <img
                src={incoming.src}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain rounded-[3px] bg-[color:var(--sand)] shadow-[0_30px_60px_-30px_rgba(46,46,46,0.5)]"
              />
            ) : (
              <PageSkeleton />
            )
          ) : null}

          {/* Current page — flips away on transition */}
          <div
            key={`${index}-${flipDir ?? "idle"}`}
            className="absolute inset-0 rounded-[3px] overflow-hidden bg-[color:var(--sand)] shadow-[0_30px_60px_-30px_rgba(46,46,46,0.55)] ring-1 ring-[color:var(--charcoal)]/10"
            style={{
              transformOrigin: flipDir === "prev" ? "left center" : "right center",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              transition: reduced
                ? "opacity 280ms ease-out"
                : "transform 620ms cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 620ms ease-out",
              transform:
                flipDir === "next"
                  ? "rotateY(-172deg)"
                  : flipDir === "prev"
                    ? "rotateY(172deg)"
                    : "rotateY(0deg)",
              opacity: reduced && flipDir ? 0 : 1,
            }}
          >
            {currentLoaded ? (
              <img
                src={current.src}
                alt={current.alt}
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
                decoding="async"
              />
            ) : (
              <PageSkeleton />
            )}
            {/* Spine gradient */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[color:var(--charcoal)]/35 via-[color:var(--charcoal)]/10 to-transparent"
            />
            {/* Paper vignette */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color:var(--ivory)]/0 via-transparent to-[color:var(--charcoal)]/10"
            />
          </div>
        </div>

        {/* Arrows — desktop */}
        <button
          type="button"
          onClick={() => go("prev")}
          disabled={index === 0}
          aria-label="Previous page"
          aria-controls="travel-file-book"
          className="hidden md:flex absolute top-1/2 -left-12 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] text-[color:var(--charcoal)] shadow-sm transition hover:border-[color:var(--charcoal)]/50 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go("next")}
          disabled={index === total - 1}
          aria-label="Next page"
          aria-controls="travel-file-book"
          className="hidden md:flex absolute top-1/2 -right-12 -translate-y-1/2 h-11 w-11 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] text-[color:var(--charcoal)] shadow-sm transition hover:border-[color:var(--charcoal)]/50 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Pagination controls — mobile arrows + counter + thumbnail rail */}
      <div className="mt-7 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go("prev")}
          disabled={index === 0}
          aria-label="Previous page"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        <p
          className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)] min-w-[5.5rem] text-center"
          aria-hidden="true"
        >
          {String(index + 1).padStart(2, "0")}{" "}
          <span className="opacity-60">/</span> {String(total).padStart(2, "0")}
        </p>

        <button
          type="button"
          onClick={() => go("next")}
          disabled={index === total - 1}
          aria-label="Next page"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Thumbnail rail — visible pagination, direct jump */}
      <ul
        className="mt-5 flex items-center justify-center gap-2 md:gap-3 list-none p-0"
        role="tablist"
        aria-label="Jump to page"
      >
        {PAGES.map((p, i) => {
          const active = i === index;
          return (
            <li key={p.label}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Page ${i + 1} — ${p.label}`}
                onClick={() => goTo(i)}
                className={`group relative block h-12 w-9 md:h-14 md:w-[42px] overflow-hidden rounded-[2px] border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)] ${
                  active
                    ? "border-[color:var(--gold-deep)] shadow-[0_4px_14px_-6px_rgba(184,148,82,0.55)] scale-[1.06]"
                    : "border-[color:var(--charcoal)]/15 opacity-65 hover:opacity-100 hover:border-[color:var(--charcoal)]/40"
                }`}
              >
                <img
                  src={p.src}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-top"
                  draggable={false}
                />
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[5px] mx-auto h-[2px] w-4 rounded-full bg-[color:var(--gold-deep)]"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RecentJourney() {
  return (
    <section
      id="multi-day"
      className="he-section-rule section-enter section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
      aria-labelledby="bespoke-designer-title"
    >
      <div className="container-x">
        <div className="reveal text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <span className="he-eyebrow-bar mb-5">Bespoke Travel Designer</span>
          <h2
            id="bespoke-designer-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.4rem] leading-[1.1] md:leading-[1.02] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium text-balance"
          >
            A Portugal{" "}
            <span className="italic font-normal text-[color:var(--teal)]">
              written around you.
            </span>
          </h2>
          <p className="mt-5 font-[family-name:var(--font-sans)] text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.65] max-w-md mx-auto">
            Beside the Studio, our quiet flagship: a private
            travel-design service for those who want their journey
            shaped end-to-end by a local — and delivered as a book,
            not a booking.
          </p>
          <span aria-hidden="true" className="gold-rule mt-7 md:mt-8 mx-auto block max-w-[3rem]" />
        </div>

        {/* Pull quote */}
        <div className="reveal max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <p className="font-[family-name:var(--font-serif)] italic text-[1.15rem] md:text-[1.45rem] leading-[1.45] text-[color:var(--charcoal)]">
            “A private travel story —{" "}
            <span className="text-[color:var(--teal)]">written for you</span>, by a local
            travel designer.”
          </p>
        </div>

        {/* Three pillars */}
        <ul className="reveal grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mb-14 md:mb-20 list-none p-0">
          {PILLARS.map((p) => (
            <li
              key={p.label}
              className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--sand)] px-5 py-5 md:px-6 md:py-6"
            >
              <div className="serif text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
                {p.label}
              </div>
              <p className="mt-3 text-[1.05rem] md:text-[1.15rem] leading-[1.4] text-[color:var(--charcoal)]">
                {p.body}
              </p>
            </li>
          ))}
        </ul>

        {/* Proof — flip-through book */}
        <div
          id="travel-file-book"
          className="reveal max-w-4xl mx-auto text-center mb-8 md:mb-10"
        >
          <span className="he-eyebrow-bar">Inside a real travel file</span>
          <SectionTitle as="h3" size="compact" spacing="normal">
            Turn the pages.
          </SectionTitle>
          <p className="mt-3 font-[family-name:var(--font-sans)] text-[14px] md:text-[15px] text-[color:var(--charcoal-soft)] leading-[1.6] max-w-lg mx-auto">
            Five pages from a private travel file we delivered this year.
            Swipe on mobile, click the arrows or thumbnails, or use the
            keyboard to flip through.
          </p>
        </div>

        <BookFlip />

        <p className="reveal mt-8 font-[family-name:var(--font-display)] text-center text-[11px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)] font-semibold">
          From one of our private bespoke journeys — names removed
        </p>

        {/* CTA */}
        <div className="reveal mt-14 md:mt-16 max-w-2xl mx-auto text-center">
          <p className="font-[family-name:var(--font-serif)] italic text-[1.1rem] md:text-[1.25rem] text-[color:var(--teal)] leading-snug">
            “Tell us where you want to go — we'll write the rest.”
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/multi-day"
              className="inline-flex items-center justify-center gap-2 rounded-[2px] bg-[color:var(--teal)] px-6 py-3 font-[family-name:var(--font-display)] text-[13px] uppercase tracking-[0.22em] font-semibold text-[color:var(--ivory)] transition-colors hover:bg-[color:var(--teal-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
            >
              Start the conversation
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-[color:var(--charcoal)]/25 px-6 py-3 font-[family-name:var(--font-display)] text-[13px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)] transition-colors hover:border-[color:var(--charcoal)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2"
            >
              Talk to a designer
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default RecentJourney;
