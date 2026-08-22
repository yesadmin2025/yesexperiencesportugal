import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaButton } from "@/components/ui/CtaButton";
import { CtaPair } from "@/components/ui/CtaPair";

/**
 * Bespoke Travel Designer — proof block.
 *
 * All 23 pages of a real, anonymised private travel file, flippable in
 * place and tappable to open full-screen so guests on a phone can
 * actually read the itinerary. No external PDF — the pages themselves
 * are the proof.
 */

const TOTAL_PAGES = 23;

const PAGE_LABELS: Record<number, string> = {
  1: "Cover",
  2: "Welcome",
  3: "Reservations",
  4: "Route",
  5: "Planning",
};

const PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => {
  const n = i + 1;
  const label = PAGE_LABELS[n] ?? `Page ${n}`;
  return {
    src: `/travel-file-sample/page-${String(n).padStart(2, "0")}.jpg`,
    label,
    alt:
      n === 1
        ? "Travel Designer Portugal — private travel file, cover page"
        : `Private Portugal travel file — ${label.toLowerCase()}`,
  };
}) as ReadonlyArray<{ src: string; label: string; alt: string }>;

const PILLARS = [
  {
    label: "Portugal-wide journeys",
    body: "Portugal-wide routes, paced for the way you travel — from a few days to a full trip.",
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

/**
 * PageLightbox — full-screen readable overlay for a single travel-file
 * page. Opens on tap from the flip-book or any thumbnail so guests
 * viewing on a 393px handset can actually read the itinerary. Pinch-to-
 * zoom is enabled via `touch-action: pinch-zoom` on the image; ← / →
 * swipe or arrow keys move between pages; Esc closes.
 */
function PageLightbox({
  index,
  onClose,
  onIndex,
}: {
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const total = PAGES.length;
  const touchX = useRef<number | null>(null);
  const page = PAGES[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex(Math.min(total - 1, index + 1));
      else if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, total, onClose, onIndex]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Travel file — page ${index + 1} of ${total}: ${page.label}`}
      className="fixed inset-0 z-[100] flex flex-col bg-[color:var(--ivory)] animate-in fade-in duration-200"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) < 40) return;
        if (dx < 0) onIndex(Math.min(total - 1, index + 1));
        else onIndex(Math.max(0, index - 1));
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--charcoal)]/10">
        <p className="font-[family-name:var(--font-display)] text-[10.5px] uppercase tracking-[0.3em] font-semibold text-[color:var(--charcoal)]">
          {String(index + 1).padStart(2, "0")}
          <span className="mx-1.5 text-[color:var(--charcoal-soft)]/60">/</span>
          {String(total).padStart(2, "0")}
          <span className="ml-3 font-normal normal-case tracking-normal text-[color:var(--charcoal-soft)] italic">
            {page.label}
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close full-screen page"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--charcoal)] hover:bg-[color:var(--charcoal)]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Page */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-auto p-3 sm:p-6">
        <img
          key={page.src}
          src={page.src}
          alt={page.alt}
          loading="lazy"
          decoding="async"
          className="mx-auto max-h-full w-auto max-w-full object-contain shadow-[0_30px_60px_-30px_rgba(46,46,46,0.5)] ring-1 ring-[color:var(--charcoal)]/10 bg-white"
          style={{ touchAction: "pinch-zoom" }}
          draggable={false}
        />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[color:var(--charcoal)]/10">
        <button
          type="button"
          onClick={() => onIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          aria-label="Previous page"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p
          aria-hidden="true"
          className="font-[family-name:var(--font-serif)] italic text-[13px] text-[color:var(--charcoal-soft)] px-2 truncate"
        >
          {page.label}
        </p>
        <button
          type="button"
          onClick={() => onIndex(Math.min(total - 1, index + 1))}
          disabled={index === total - 1}
          aria-label="Next page"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

function BookFlip() {
  const [index, setIndex] = useState(0);
  const [flipDir, setFlipDir] = useState<"next" | "prev" | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
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
        role="region"
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
                loading="lazy"
                decoding="async"
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
                onClick={openLightbox}
                className="absolute inset-0 h-full w-full object-contain cursor-zoom-in"
                draggable={false}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <PageSkeleton />
            )}
            {/* Expand affordance — tap target for mobile readability */}
            <button
              type="button"
              onClick={openLightbox}
              aria-label="Open this page full screen"
              className="absolute bottom-3 right-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--ivory)]/95 text-[color:var(--charcoal)] shadow-[0_6px_18px_-8px_rgba(46,46,46,0.5)] ring-1 ring-[color:var(--charcoal)]/15 backdrop-blur-sm transition hover:bg-[color:var(--ivory)] hover:ring-[color:var(--charcoal)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)]"
            >
              <ZoomIn size={16} aria-hidden="true" />
            </button>
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

      {/* Thumbnail rail — 23 pages, horizontally scrollable */}
      <div
        className="mt-6 flex items-center gap-2.5 md:gap-3 overflow-x-auto snap-x px-4 -mx-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Jump to page"
      >
        {PAGES.map((p, i) => {
          const active = i === index;
          return (
            <button
              key={p.label}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Page ${i + 1} — ${p.label}`}
              onClick={() => goTo(i)}
              className={`group relative block shrink-0 snap-start h-14 w-11 md:h-16 md:w-12 overflow-hidden rounded-[2px] border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)] ${
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
          );
        })}
      </div>

      {/* All 23 pages are shown in the flip-book above and open full-screen on tap. */}

      {lightboxOpen ? (
        <PageLightbox
          index={index}
          onClose={closeLightbox}
          onIndex={(i) => setIndex(Math.max(0, Math.min(total - 1, i)))}
        />
      ) : null}
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
          <Eyebrow className="mb-4">Travel Designer</Eyebrow>
          <h2
            id="bespoke-designer-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] lg:text-[3.4rem] leading-[1.1] lg:leading-[1.02] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium text-balance"
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

        {/* Three pillars — editorial centred rhythm. Georgia italic
            headings echo the H2's emphasis voice; hairline gold rule
            separates the block from the book above. */}
        <div className="reveal mt-9 md:mt-10 max-w-2xl mx-auto text-center border-t border-[color:var(--border)] pt-7 md:pt-8">
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 list-none p-0">
            {PILLARS.map((p) => (
              <li key={p.label} className="he-card-lift px-2">
                <h3 className="font-[family-name:var(--font-serif)] italic font-medium text-[color:var(--charcoal)] text-[18px] md:text-[19px] leading-[1.25]">
                  {p.label}
                </h3>
                <span
                  aria-hidden="true"
                  className="mt-2 mx-auto block h-[1px] w-6 bg-[color:var(--gold)]/60"
                />
                <p className="mt-3 font-[family-name:var(--font-sans)] text-[13.5px] md:text-[14px] leading-[1.6] text-[color:var(--charcoal-soft)]">
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Signature CTA ramp — matches homepage canonical voice:
            Inter 11px 0.25em uppercase with a gold hairline that
            expands on hover into a small chevron. Primary sits at
            full charcoal; secondary softens to 70% opacity. */}
        <div className="reveal mt-10 md:mt-12 max-w-2xl mx-auto text-center">
          <CtaPair justify="center" className="gap-x-10">
            <CtaButton
              to="/multi-day"
              variant="hairline"
              aria-label="Start the conversation with a Travel Designer"
              className="opacity-100"
            >
              Start the conversation
            </CtaButton>
            <CtaButton to="/contact" variant="hairline" aria-label="Talk to a designer">
              Talk to a designer
            </CtaButton>
          </CtaPair>
        </div>
      </div>
    </section>
  );
}

export default RecentJourney;
