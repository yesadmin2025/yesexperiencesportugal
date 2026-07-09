import portrait from "@/assets/founder/nidia-portrait.jpg";

/**
 * FounderByline — compact founder quote block for placement near primary CTAs.
 * Small round portrait + one-line quote in Georgia italic teal + attribution.
 * Uses locked brand tokens only.
 */
interface Props {
  quote: string;
  className?: string;
}

export function FounderByline({ quote, className = "" }: Props) {
  return (
    <figure
      className={[
        "flex items-center gap-4 max-w-[520px] mx-auto",
        "border-l-2 border-[color:var(--gold)] pl-4",
        "text-left",
        className,
      ].join(" ")}
    >
      <img
        src={portrait}
        alt="Nídia Almeida, founder of YES Experiences Portugal."
        loading="lazy"
        width={56}
        height={56}
        className="h-14 w-14 rounded-full object-cover object-center shrink-0"
      />
      <figcaption className="min-w-0">
        <p className="font-serif italic text-[0.95rem] md:text-[1rem] leading-snug text-[color:var(--teal)]">
          “{quote}”
        </p>
        <p className="mt-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]">
          Nídia Almeida · Founder
        </p>
      </figcaption>
    </figure>
  );
}

export default FounderByline;
