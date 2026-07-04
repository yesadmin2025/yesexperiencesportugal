import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

// Pages from the same real, anonymised private travel file used on
// the /multi-day Travel Designer page — kept in sync so the homepage
// proof and the deep page show the exact same document.
const samplePage01 = { url: "/travel-file-sample/page-01.jpg" };
import samplePage02 from "@/assets/travel-file-sample/page-02.jpg.asset.json";
import samplePage03 from "@/assets/travel-file-sample/page-03.jpg.asset.json";
import samplePage04 from "@/assets/travel-file-sample/page-04.jpg.asset.json";
import samplePage05 from "@/assets/travel-file-sample/page-05.jpg.asset.json";
import samplePage06 from "@/assets/travel-file-sample/page-06.jpg.asset.json";

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
  {
    src: samplePage01.url,
    label: "Cover",
    alt: "Travel Designer Portugal sample itinerary file — cover page",
  },
  {
    src: samplePage02.url,
    label: "Welcome",
    alt: "Private multi-day Portugal itinerary — welcome page",
  },
  {
    src: samplePage03.url,
    label: "Reservations",
    alt: "Private Portugal journey — confirmed reservations page",
  },
  {
    src: samplePage04.url,
    label: "Route",
    alt: "Portugal Travel Designer journey across regions — route map",
  },
  {
    src: samplePage05.url,
    label: "Planning",
    alt: "Private multi-day Portugal itinerary with local route planning",
  },
  {
    src: samplePage06.url,
    label: "A day",
    alt: "Travel Designer Portugal — day-by-day itinerary card",
  },
] as const;

const PILLARS = [
  {
    label: "Regional journeys",
    body: "Lisbon, Alentejo, Douro, Algarve or the islands — paced for the way you travel.",
  },
  {
    label: "Stays & logistics",
    body: "Hand-picked properties and transfers — every overnight confirmed before you leave.",
  },
  {
    label: "Delivered as a book",
    body: "A travel file with days, stays and local contacts — not a generic booking.",
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
        style={{ perspective: "2400px", width: "min(100%, 420px)" }}
      >
        {/* Premium dossier shadow — warmer, deeper, layered. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 -bottom-7 h-10 rounded-[50%] bg-[color:var(--charcoal-deep)]/35 blur-3xl opacity-70"
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
                className="absolute inset-0 h-full w-full object-contain rounded-[3px] bg-[color:var(--sand)] shadow-[0_40px_80px_-30px_rgba(46,46,46,0.6),0_18px_36px_-18px_rgba(46,46,46,0.35)]"
              />
            ) : (
              <PageSkeleton />
            )
          ) : null}

          {/* Current page — flips away on transition */}
          <div
            key={`${index}-${flipDir ?? "idle"}`}
            className="absolute inset-0 rounded-[3px] overflow-hidden bg-[color:var(--sand)] shadow-[0_44px_88px_-32px_rgba(46,46,46,0.62),0_20px_40px_-20px_rgba(46,46,46,0.38)] ring-1 ring-[color:var(--charcoal)]/12"
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

      {/* Pagination controls — mobile arrows + counter + page label */}
      <div className="mt-8 md:mt-7 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go("prev")}
          disabled={index === 0}
          aria-label="Previous page"
          aria-controls="travel-file-book"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        <div className="flex flex-col items-center min-w-[8rem]">
          <p
            className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.32em] font-semibold text-[color:var(--charcoal)]"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
            <span className="mx-1.5 text-[color:var(--charcoal-soft)]/60">/</span>
            {String(total).padStart(2, "0")}
          </p>
          <p
            key={current.label}
            className="mt-1.5 font-[family-name:var(--font-serif)] italic text-[14px] md:text-[15px] leading-[1.2] text-[color:var(--charcoal-soft)] transition-opacity duration-300"
          >
            {current.label}
          </p>
        </div>

        <button
          type="button"
          onClick={() => go("next")}
          disabled={index === total - 1}
          aria-label="Next page"
          aria-controls="travel-file-book"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Thumbnail rail — visible pagination, direct jump */}
      <ul
        className="mt-6 flex items-center justify-center gap-2.5 md:gap-3 list-none p-0"
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
                className={`group relative block h-14 w-[42px] md:h-16 md:w-12 overflow-hidden rounded-[2px] border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)] ${
                  active
                    ? "border-[color:var(--gold-deep)] shadow-[0_6px_18px_-8px_rgba(184,148,82,0.6)] scale-[1.08]"
                    : "border-[color:var(--charcoal)]/15 opacity-60 hover:opacity-100 hover:border-[color:var(--charcoal)]/40"
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
                    className="absolute inset-x-0 -bottom-[5px] mx-auto h-[2px] w-5 rounded-full bg-[color:var(--gold-deep)]"
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
      className="he-section-rule section-enter py-14 md:py-20 bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
      aria-labelledby="bespoke-designer-title"
    >
      <div className="container-x">
        {/* Header — tightened. The book itself carries the proof, so we
            keep one headline + one supporting line and let the object
            below do the talking. */}
        <div className="reveal text-center max-w-2xl mx-auto mb-6 md:mb-8">
          <span className="he-eyebrow-bar mb-4">Travel Designer</span>
          <h2
            id="bespoke-designer-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.4rem] leading-[1.1] md:leading-[1.02] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium text-balance"
          >
            A Portugal{" "}
            <span className="italic font-normal text-[color:var(--teal)]">written around you.</span>
          </h2>
          <p className="mt-4 font-[family-name:var(--font-sans)] text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.65] max-w-md mx-auto">
            Multi-day Portugal, composed by a local — delivered as a book, not a booking.
          </p>
          <span aria-hidden="true" className="gold-rule mt-5 md:mt-6 mx-auto block max-w-[3rem]" />
        </div>

        {/* Proof — the book is the focal object. Enlarged slightly and
            given a deeper, warmer dossier shadow so it reads as a luxury
            travel file, not a flat image. */}
        <div id="travel-file-book" className="bespoke-book-stage">
          <BookFlip />
        </div>

        <p className="reveal mt-5 font-[family-name:var(--font-display)] text-center text-[11px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)] font-semibold">
          A real example
        </p>

        {/* Three pillars — tight caption strip beneath the book. Same
            words, lower visual weight, much less vertical space. */}
        <ul className="reveal mt-7 md:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto list-none p-0 border-t border-[color:var(--border)] pt-5 md:pt-6 text-center sm:text-left">
          {PILLARS.map((p) => (
            <li key={p.label}>
              <div className="font-[family-name:var(--font-display)] text-[10px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
                {p.label}
              </div>
              <p className="mt-1.5 font-[family-name:var(--font-sans)] text-[13px] md:text-[13.5px] leading-[1.5] text-[color:var(--charcoal-soft)]">
                {p.body}
              </p>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="reveal mt-7 md:mt-9 max-w-2xl mx-auto text-center">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
