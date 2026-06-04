import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

// Pages from a real, anonymized private travel file we delivered.
// Used as proof of craft for the Bespoke Travel Designer service.
import pageCover from "@/assets/travel-file/cover.jpg";
import pageRoute from "@/assets/travel-file/route.jpg";
import pageReservations from "@/assets/travel-file/reservations.jpg";
import pageDay from "@/assets/travel-file/day.jpg";
import pageAccommodations from "@/assets/travel-file/accommodations.jpg";

/**
 * Bespoke Travel Designer — proof block.
 *
 * Headline uses the canonical Typography v3 ramp: Montserrat for the
 * full title, Georgia italic ONLY on the emphasis phrase "written
 * around you" (teal). The proof block presents the delivered private
 * travel file as a flip-through book — mobile swipes through pages,
 * desktop pages turn from the spine with a 3D perspective. All motion
 * collapses to a fade when prefers-reduced-motion is set.
 */

const PAGES = [
  { src: pageCover, alt: "Cover of a private travel file — Portugal, Beyond the Postcards" },
  { src: pageRoute, alt: "The route — a hand-designed multi-region itinerary across Portugal" },
  { src: pageReservations, alt: "Confirmed reservations — every overnight reserved before departure" },
  { src: pageDay, alt: "A day in the file — morning, lunch, afternoon, sunset, evening" },
  { src: pageAccommodations, alt: "Where you stay — properties chosen to deepen each region" },
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

function BookFlip() {
  const [index, setIndex] = useState(0);
  const [flipDir, setFlipDir] = useState<"next" | "prev" | null>(null);
  const reduced = usePrefersReducedMotion();
  const touchStartX = useRef<number | null>(null);
  const flipping = useRef(false);

  const total = PAGES.length;

  const go = (dir: "next" | "prev") => {
    if (flipping.current) return;
    const nextIdx = dir === "next" ? index + 1 : index - 1;
    if (nextIdx < 0 || nextIdx >= total) return;
    if (reduced) {
      setIndex(nextIdx);
      return;
    }
    flipping.current = true;
    setFlipDir(dir);
    window.setTimeout(() => {
      setIndex(nextIdx);
      setFlipDir(null);
      flipping.current = false;
    }, 620);
  };

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
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go("next");
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go("prev");
    }
  };

  const current = PAGES[index];
  const incoming = flipDir === "next" ? PAGES[index + 1] : flipDir === "prev" ? PAGES[index - 1] : null;

  return (
    <div className="reveal mx-auto max-w-3xl">
      {/* Book stage */}
      <div
        role="group"
        aria-roledescription="book"
        aria-label={`Page ${index + 1} of ${total}: ${current.alt}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative mx-auto outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--ivory)] rounded-[2px]"
        style={{
          perspective: "2200px",
          width: "min(100%, 520px)",
        }}
      >
        {/* Soft cast shadow under the book */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -bottom-5 h-8 rounded-[50%] bg-[color:var(--charcoal)]/25 blur-2xl opacity-60"
        />

        <div
          className="relative aspect-[3/4] w-full"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Static back page (becomes visible mid-flip) */}
          {incoming ? (
            <img
              src={incoming.src}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-top rounded-[3px] shadow-[0_30px_60px_-30px_rgba(46,46,46,0.5)]"
            />
          ) : null}

          {/* Current page — flips away on transition */}
          <div
            key={`${index}-${flipDir ?? "idle"}`}
            className="absolute inset-0 rounded-[3px] overflow-hidden shadow-[0_30px_60px_-30px_rgba(46,46,46,0.55)] ring-1 ring-[color:var(--charcoal)]/10"
            style={{
              transformOrigin: flipDir === "prev" ? "left center" : "right center",
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              transition: reduced
                ? "opacity 280ms ease-out"
                : "transform 620ms cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 620ms ease-out",
              transform: flipDir === "next"
                ? "rotateY(-172deg)"
                : flipDir === "prev"
                  ? "rotateY(172deg)"
                  : "rotateY(0deg)",
              opacity: reduced && flipDir ? 0 : 1,
            }}
          >
            <img
              src={current.src}
              alt={current.alt}
              className="absolute inset-0 h-full w-full object-cover object-top"
              draggable={false}
            />
            {/* Spine gradient on the binding edge */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[color:var(--charcoal)]/35 via-[color:var(--charcoal)]/10 to-transparent"
            />
            {/* Paper warmth + subtle vignette */}
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
          className="hidden md:flex absolute top-1/2 -left-12 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] text-[color:var(--charcoal)] shadow-sm transition hover:border-[color:var(--charcoal)]/50 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go("next")}
          disabled={index === total - 1}
          aria-label="Next page"
          className="hidden md:flex absolute top-1/2 -right-12 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] text-[color:var(--charcoal)] shadow-sm transition hover:border-[color:var(--charcoal)]/50 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Page indicator + mobile controls */}
      <div className="mt-7 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => go("prev")}
          disabled={index === 0}
          aria-label="Previous page"
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] disabled:opacity-30"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2" aria-hidden="true">
          {PAGES.map((_, i) => (
            <span
              key={i}
              className={`h-[5px] rounded-full transition-all duration-300 ${
                i === index
                  ? "w-6 bg-[color:var(--gold-deep)]"
                  : "w-[5px] bg-[color:var(--charcoal)]/25"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go("next")}
          disabled={index === total - 1}
          aria-label="Next page"
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] disabled:opacity-30"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <p className="mt-3 text-center text-[11px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
        {String(index + 1).padStart(2, "0")} <span className="opacity-60">/</span> {String(total).padStart(2, "0")}
      </p>
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
            className="mt-3 font-[family-name:var(--font-display)] font-semibold text-[2rem] sm:text-[2.4rem] md:text-[3.4rem] leading-[1.1] md:leading-[1.02] tracking-[-0.018em] text-[color:var(--charcoal)] text-balance"
          >
            A Portugal{" "}
            <span className="font-[family-name:var(--font-serif)] italic font-normal text-[color:var(--teal)]">
              written around you.
            </span>
          </h2>
          <p className="mt-5 text-[14.5px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.65] max-w-md mx-auto">
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
            <span className="text-[color:var(--teal)]">written for you</span>, by a
            local travel designer.”
          </p>
        </div>

        {/* Three pillars */}
        <ul className="reveal grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mb-14 md:mb-20 list-none p-0">
          {PILLARS.map((p) => (
            <li
              key={p.label}
              className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--sand)] px-5 py-5 md:px-6 md:py-6"
            >
              <div className="font-[family-name:var(--font-display)] text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
                {p.label}
              </div>
              <p className="mt-3 font-[family-name:var(--font-serif)] text-[1.05rem] md:text-[1.15rem] leading-[1.4] text-[color:var(--charcoal)]">
                {p.body}
              </p>
            </li>
          ))}
        </ul>

        {/* Proof — flip-through book */}
        <div className="reveal max-w-4xl mx-auto text-center mb-8 md:mb-10">
          <p className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-deep)] font-semibold">
            Inside a real travel file
          </p>
          <h3 className="mt-3 font-[family-name:var(--font-display)] font-semibold text-[1.5rem] md:text-[2rem] leading-[1.15] tracking-[-0.012em] text-[color:var(--charcoal)]">
            Turn the pages.
          </h3>
          <p className="mt-3 text-[14px] md:text-[15px] text-[color:var(--charcoal-soft)] leading-[1.6] max-w-lg mx-auto">
            Five pages from a private travel file we delivered this year.
            Swipe, click the arrows, or use the keyboard to flip through.
          </p>
        </div>

        <BookFlip />

        <p className="reveal mt-8 text-center text-[11px] uppercase tracking-[0.28em] text-[color:var(--charcoal-soft)] font-semibold">
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
              className="inline-flex items-center justify-center gap-2 rounded-[2px] border border-[color:var(--charcoal)]/25 px-6 py-3 font-[family-name:var(--font-display)] text-[13px] uppercase tracking-[0.22em] font-semibold text-[color:var(--charcoal)] transition-colors hover:border-[color:var(--charcoal)]/60"
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
