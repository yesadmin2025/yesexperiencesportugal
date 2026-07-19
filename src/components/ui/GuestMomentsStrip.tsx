/**
 * GuestMomentsStrip — editorial photo strip of real guest / craftsman
 * moments. Single primitive reused across Homepage, About, Corporate
 * and Multi-day so the visual language stays one system.
 *
 * Contract:
 *   • Real photography only (owner-supplied). No stock, no fabricated
 *     captions — the caller passes editorial captions verbatim.
 *   • Uses existing `data-motion="fade-up"` primitive + staggered
 *     `data-motion-delay` so it inherits the site-wide motion grammar
 *     (`home-motion.ts`) — no new animation library.
 *   • Reduced-motion safe (controller auto-visible).
 *   • Mobile: horizontal snap-scroll of 76%-wide cards.
 *     Desktop: 3–4 column responsive grid, 4:5 aspect.
 *   • Captions in Fraunces italic teal (Editorial v3), body in Inter.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { buildResponsiveSrc } from "@/lib/responsive-image";
import { useEditorialOverrides, type EditorialModuleKey } from "@/lib/editorial-overrides";

export type GuestMoment = {
  src: string;
  alt: string;
  caption: string;
};

type Props = {
  eyebrow: string;
  title: ReactNode;
  titleEm?: ReactNode;
  photos: GuestMoment[];
  /** Background token. Defaults to ivory. */
  surface?: "ivory" | "sand";
  /** Optional footnote below the strip. */
  footnote?: string;
  /** When set, publishable admin overrides for this module replace matching slots. */
  moduleKey?: EditorialModuleKey;
};

export function GuestMomentsStrip({
  eyebrow,
  title,
  titleEm,
  photos,
  surface = "ivory",
  footnote,
  moduleKey,
}: Props) {
  const effective = useEditorialOverrides(
    moduleKey ?? ("homepage_moments" as EditorialModuleKey),
    photos,
  );
  const rendered = moduleKey ? effective : photos;
  const bg = surface === "sand" ? "bg-[color:var(--sand)]" : "bg-[color:var(--ivory)]";
  const listRef = useRef<HTMLUListElement | null>(null);

  // Viewport-gate ken-burns: pause off-screen images to save GPU/paint on mobile.
  useEffect(() => {
    const root = listRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img.ken-burns-slow"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle("kb-paused", !e.isIntersecting);
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );
    imgs.forEach((img) => {
      img.classList.add("kb-paused");
      io.observe(img);
    });
    return () => io.disconnect();
  }, [rendered.length]);

  return (
    <section
      className={`py-16 md:py-24 ${bg}`}
      aria-labelledby="guest-moments-title"
      data-section="guest-moments"
    >
      <div className="container-x">
        <header className="max-w-2xl">
          <div data-motion="fade-up-sm">
            <span className="inline-block font-[family-name:var(--font-display)] text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold-deep)]">
              {eyebrow}
            </span>
          </div>
          <h2
            id="guest-moments-title"
            data-motion="fade-up-sm"
            data-motion-delay="80"
            className="mt-4 font-display font-medium text-[1.5rem] md:text-[2rem] leading-[1.15] tracking-tight text-[color:var(--charcoal)]"
          >
            {title}
            {titleEm && (
              <>
                {" "}
                <em className="font-serif italic text-[color:var(--teal)] font-normal">
                  {titleEm}
                </em>
              </>
            )}
          </h2>
          <span
            className="mt-5 block h-px w-16 bg-[color:var(--gold)]/70"
            aria-hidden="true"
          />
        </header>

        {/* Mobile: horizontal snap-scroll. Desktop: responsive grid. */}
        <ul
          ref={listRef}
          className="
            mt-10 md:mt-14
            flex gap-4 overflow-x-auto snap-x snap-mandatory
            -mx-4 px-4 pb-2
            md:mx-0 md:px-0 md:pb-0 md:overflow-visible
            md:grid md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
            scrollbar-none
          "
          role="list"
        >
          {rendered.map((photo, idx) => {
            const responsive = buildResponsiveSrc(photo.src, { sizes: "portrait" });
            const kbVariant = idx % 3 === 1 ? " ken-burns-slow--b" : idx % 3 === 2 ? " ken-burns-slow--c" : "";
            return (
            <li
              key={photo.src}
              data-motion="fade-up"
              data-motion-delay={String(Math.min(idx * 90, 360))}
              className="
                shrink-0 basis-[76%] snap-start
                md:basis-auto
                group
              "
            >
              <figure className="flex h-full flex-col">
                <div className="relative overflow-hidden rounded-[2px] bg-[color:var(--sand)] aspect-[4/5] shadow-[0_20px_40px_-24px_rgba(46,46,46,0.18)]">
                  <img
                    src={responsive.src}
                    srcSet={responsive.srcSet}
                    alt={photo.alt}
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={idx === 0 ? "high" : "auto"}
                    sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 76vw"
                    className={`ken-burns-slow${kbVariant} absolute inset-0 h-full w-full object-cover`}
                  />
                </div>
                <figcaption className="mt-4 font-serif italic text-[0.95rem] md:text-[1rem] leading-snug text-[color:var(--teal)]">
                  {photo.caption}
                </figcaption>
              </figure>
            </li>
            );
          })}
        </ul>

        {footnote && (
          <p
            data-motion="fade-up-sm"
            data-motion-delay="120"
            className="mt-8 text-[13px] tracking-wide text-[color:var(--charcoal-soft)]"
          >
            {footnote}
          </p>
        )}
      </div>
    </section>
  );
}
