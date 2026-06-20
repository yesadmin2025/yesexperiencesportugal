import * as React from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { CtaButton } from "@/components/ui/CtaButton";

/**
 * EditorialCard — canonical homepage card with named slots.
 *
 * Slots (in render order):
 *   eyebrow → small uppercase label with optional accent dot
 *   title   → serif headline (h3), font-medium, may include <span class="italic font-normal text-[color:var(--teal)]"> for emphasis
 *   body    → Inter upright paragraph, max-w-md
 *   detail  → uppercase metadata line (e.g. "Private host · any group size")
 *   cta     → primary CTA (CtaButton)
 *   trust   → quiet reassurance line in --charcoal-soft
 *
 * Optional `image` slot renders an editorial cover on one side (md+),
 * stacked above the text on mobile. `reverse` flips the side on md+.
 * When `image` is omitted, the card is a single text column — useful
 * for future text-only blocks. Typography + spacing + motion are
 * locked here so every block on the homepage shares one rhythm.
 */

export interface EditorialCardImage {
  src: string;
  alt?: string;
  to?: LinkProps["to"];
}

export interface EditorialCardCTA {
  label: string;
  to: LinkProps["to"];
  ariaLabel?: string;
}

export interface EditorialCardProps {
  id?: string;
  eyebrow: string;
  /** CSS color for the eyebrow accent dot. Defaults to --charcoal. */
  accent?: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  detail?: React.ReactNode;
  cta?: EditorialCardCTA;
  trust?: React.ReactNode;
  image?: EditorialCardImage;
  reverse?: boolean;
  className?: string;
}

function ImageSide({
  image,
  eyebrow,
  cta,
  reverse,
}: {
  image: EditorialCardImage;
  eyebrow: string;
  cta?: EditorialCardCTA;
  reverse?: boolean;
}) {
  const sideClass =
    "he-tilt relative block md:col-span-7 overflow-hidden rounded-[2px] border border-[color:var(--border)] bg-[color:var(--card)] transition-transform duration-300 ease-out group-hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2 " +
    (reverse ? "md:order-2" : "md:order-1");

  const Inner = (
    <div className="he-image-cinema he-image-rise relative aspect-[4/3] md:aspect-[5/4] overflow-hidden">
      <img
        src={image.src}
        alt={image.alt ?? ""}
        aria-hidden={image.alt ? undefined : "true"}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.05]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[color:var(--charcoal-deep)]/40 via-[color:var(--charcoal-deep)]/10 to-transparent"
      />
      <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--ivory)]/95 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal)] shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
        <span aria-hidden="true" className="live-dot" />
        {eyebrow}
      </span>
    </div>
  );

  const handleTilt = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--tilt-y", `${(px * 5).toFixed(2)}deg`);
    el.style.setProperty("--tilt-x", `${(-py * 4).toFixed(2)}deg`);
  };
  const handleReset = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.setProperty("--tilt-y", "0deg");
    el.style.setProperty("--tilt-x", "0deg");
  };

  if (image.to) {
    return (
      <Link
        to={image.to}
        aria-label={cta?.ariaLabel ?? cta?.label ?? eyebrow}
        onMouseMove={handleTilt}
        onMouseLeave={handleReset}
        className={sideClass}
      >
        {Inner}
      </Link>
    );
  }
  return (
    <div onMouseMove={handleTilt} onMouseLeave={handleReset} className={sideClass}>
      {Inner}
    </div>
  );
}

export function EditorialCard({
  id,
  eyebrow,
  accent = "var(--charcoal)",
  title,
  body,
  detail,
  cta,
  trust,
  image,
  reverse,
  className,
}: EditorialCardProps) {
  const textColOrder = image ? (reverse ? "md:order-1" : "md:order-2") : "";
  const textColSpan = image ? "md:col-span-5" : "md:col-span-12 max-w-2xl mx-auto";

  return (
    <article
      id={id}
      className={
        "reveal-stagger he-seq group grid grid-cols-1 md:grid-cols-12 gap-7 md:gap-12 items-center scroll-mt-24 md:scroll-mt-28 " +
        (className ?? "")
      }
    >
      {image ? <ImageSide image={image} eyebrow={eyebrow} cta={cta} reverse={reverse} /> : null}

      <div className={`flex flex-col pt-1 md:pt-0 ${textColSpan} ${textColOrder}`}>
        <span
          aria-hidden="true"
          className="gold-rule mb-4 md:mb-5 max-w-[3rem] md:max-w-[3.5rem]"
        />
        <span className="inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.28em] font-semibold text-[color:var(--charcoal-soft)]">
          <span
            aria-hidden="true"
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: accent }}
          />
          {eyebrow}
        </span>

        <h3 className="serif mt-3 text-[1.6rem] md:text-[2.1rem] leading-[1.14] md:leading-[1.08] tracking-[-0.014em] text-[color:var(--charcoal)] font-medium text-balance">
          {title}
        </h3>

        {body ? (
          <p className="mt-4 text-[14.5px] md:text-[15.5px] leading-[1.65] text-[color:var(--charcoal-soft)] max-w-md">
            {body}
          </p>
        ) : null}

        {detail ? (
          <p className="mt-5 inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.24em] font-semibold text-[color:var(--charcoal-soft)]">
            <span
              aria-hidden="true"
              className="inline-block h-[6px] w-[6px] rounded-full"
              style={{ backgroundColor: accent }}
            />
            {detail}
          </p>
        ) : null}

        {cta ? (
          <CtaButton to={cta.to} variant="primary" className="mt-7 md:mt-6 self-start">
            {cta.label}
          </CtaButton>
        ) : null}

        {trust ? (
          <p className="mt-3 text-[11.5px] leading-[1.55] text-[color:var(--charcoal-soft)]/85 font-normal">
            {trust}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default EditorialCard;
