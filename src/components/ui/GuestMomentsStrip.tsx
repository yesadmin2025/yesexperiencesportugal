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
import { type ReactNode } from "react";

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
};

export function GuestMomentsStrip({
  eyebrow,
  title,
  titleEm,
  photos,
  surface = "ivory",
  footnote,
}: Props) {
  const bg = surface === "sand" ? "bg-[color:var(--sand)]" : "bg-[color:var(--ivory)]";

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
          {photos.map((photo, idx) => (
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
                    src={photo.src}
                    alt={photo.alt}
                    loading="lazy"
                    decoding="async"
                    className="
                      absolute inset-0 h-full w-full object-cover
                      transition-transform duration-[560ms] ease-[var(--ease-premium)]
                      md:group-hover:scale-[1.03]
                      motion-reduce:transition-none motion-reduce:transform-none
                    "
                  />
                </div>
                <figcaption className="mt-4 font-serif italic text-[0.95rem] md:text-[1rem] leading-snug text-[color:var(--teal)]">
                  {photo.caption}
                </figcaption>
              </figure>
            </li>
          ))}
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
