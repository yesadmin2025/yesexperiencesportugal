import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * TravelFilePreview — the shared, approved preview of the anonymised
 * Travel Designer book. Used on /multi-day and /trade so both surfaces
 * render the same design language.
 *
 * Manual navigation only (no autoplay, no flip/3D). Crossfade ~300ms,
 * disabled under prefers-reduced-motion. All pages lazy-loaded inside a
 * fixed aspect box so nothing shifts as they arrive.
 */

export const TOTAL_SAMPLE_PAGES = 23;

export const SAMPLE_PAGES = Array.from({ length: TOTAL_SAMPLE_PAGES }, (_, i) => {
  const n = i + 1;
  return {
    src: `/travel-file-sample/page-${String(n).padStart(2, "0")}.jpg`,
    alt: `Private Portugal travel file — page ${n}`,
  };
});

interface TravelFilePreviewProps {
  className?: string;
  /** Fires once, when the reader first advances or opens a page full size. */
  onEngage?: () => void;
}

export function TravelFilePreview({ className, onEngage }: TravelFilePreviewProps) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const engaged = useRef(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const engage = useCallback(() => {
    if (engaged.current) return;
    engaged.current = true;
    onEngage?.();
  }, [onEngage]);

  const go = useCallback(
    (delta: number) => {
      engage();
      setIndex((i) => (i + delta + TOTAL_SAMPLE_PAGES) % TOTAL_SAMPLE_PAGES);
    },
    [engage],
  );

  useEffect(() => {
    if (!lightbox) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, go]);

  const page = SAMPLE_PAGES[index];
  const thumbs = SAMPLE_PAGES.slice(0, 8);

  return (
    <div className={cn("", className)}>
      {/* Lead page */}
      <div className="relative mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => {
            engage();
            setLightbox(true);
          }}
          aria-label={`Open ${page.alt} full size`}
          className="block w-full overflow-hidden border border-[color:var(--border)] bg-white shadow-[0_24px_60px_-24px_rgba(46,46,46,0.32)] cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
        >
          <span className="block relative w-full aspect-[3/4]">
            {SAMPLE_PAGES.map((p, i) => (
              <img
                key={p.src}
                src={p.src}
                alt={i === index ? p.alt : ""}
                aria-hidden={i === index ? undefined : true}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className={cn(
                  "absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ease-out motion-reduce:transition-none",
                  i === index ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
              />
            ))}
          </span>
        </button>

        {/* Manual navigation + discreet progress */}
        <div className="mt-5 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous page"
            className="inline-flex h-11 w-11 items-center justify-center border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] transition-colors hover:border-[color:var(--gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
          <span
            className="font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)] tabular-nums"
            aria-live="polite"
          >
            {String(index + 1).padStart(2, "0")} / {TOTAL_SAMPLE_PAGES}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next page"
            className="inline-flex h-11 w-11 items-center justify-center border border-[color:var(--charcoal)]/20 text-[color:var(--charcoal)] transition-colors hover:border-[color:var(--gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
          >
            <ChevronRight size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Spread strip */}
      <div
        className="mt-8 -mx-4 md:mx-0 px-4 md:px-0 flex gap-4 overflow-x-auto snap-x snap-mandatory md:snap-none scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {thumbs.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => {
              engage();
              setIndex(i);
            }}
            aria-label={`Show page ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            className={cn(
              "relative flex-none w-[112px] md:w-[132px] snap-start overflow-hidden border bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]",
              i === index
                ? "border-[color:var(--gold)]"
                : "border-[color:var(--border)] hover:border-[color:var(--gold)]/60",
            )}
          >
            <span className="block relative w-full aspect-[3/4]">
              <img
                src={p.src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-contain"
              />
            </span>
          </button>
        ))}
      </div>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Travel file page"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[color:var(--charcoal)]/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close preview"
            className="absolute top-4 right-4 inline-flex h-11 w-11 items-center justify-center text-[color:var(--ivory)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          >
            <X size={22} strokeWidth={1.8} />
          </button>
          <img
            src={page.src}
            alt={page.alt}
            loading="lazy"
            decoding="async"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-auto max-w-full object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
          />
        </div>
      ) : null}
    </div>
  );
}
