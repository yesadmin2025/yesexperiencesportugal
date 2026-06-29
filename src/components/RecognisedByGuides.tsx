import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  getMentionsForPlacement,
  type AuthorityPlacement,
} from "@/data/externalAuthorityMentions";

/**
 * Recognised by travel guides — editorial trust strip.
 *
 * Renders 3–5 real third-party article references with verbatim quotes.
 * Visible content only; never used to build review schema.
 *
 * STRICT COPY RULES (mirrors the dataset policy):
 *  • Headline does NOT claim "featured by top media".
 *  • For `brand-direct` entries the card may say "Mentions YES Experiences".
 *  • For other entries the card says "Featured the tour we operate" — never
 *    "featured YES Experiences" — because the article ranks the product on
 *    Viator/GetYourGuide without naming the brand.
 *  • Links are real, visible, open in a new tab with rel="noopener nofollow".
 *
 * Mobile-first: vertical stack with elegant spacing. Desktop: 3 columns.
 */
export interface RecognisedByGuidesProps {
  /** Which placement bucket to render (see `externalAuthorityMentions`). */
  placement: AuthorityPlacement;
  /** Cap (defaults: homepage 3, wine-landing 5, tour pages 3). */
  limit?: number;
  /** Optional override heading. Defaults to a conservative line. */
  heading?: string;
  /** Optional override of supporting copy under the heading. */
  intro?: string;
  /** Compact = tighter padding for inline use on tour pages. */
  compact?: boolean;
}

const DEFAULT_LIMITS: Record<AuthorityPlacement, number> = {
  homepage: 3,
  "wine-landing": 5,
  "arrabida-tour": 3,
  alentejo: 2,
  "inventory-only": 0,
};

const DEFAULT_INTRO =
  "YES Experiences Portugal appears as the tour operator on leading booking platforms, and the tours we run have been compared, ranked and reviewed across independent travel guides — including a direct mention by Wine With Our Family.";

export function RecognisedByGuides({
  placement,
  limit,
  heading = "Recognised by travel guides",
  intro = DEFAULT_INTRO,
  compact = false,
}: RecognisedByGuidesProps) {
  const cap = limit ?? DEFAULT_LIMITS[placement] ?? 3;
  const mentions = getMentionsForPlacement(placement, cap);
  if (mentions.length === 0) return null;

  return (
    <section
      aria-labelledby="recognised-by-guides-title"
      className={
        compact
          ? "container-x py-10"
          : "container-x py-16 md:py-20 border-t border-[color:var(--gold-soft)]/35"
      }
    >
      <div className="max-w-2xl mx-auto text-center mb-10 md:mb-12">
        <Eyebrow className="mb-4">Mentions in independent guides</Eyebrow>
        <h2
          id="recognised-by-guides-title"
          className="font-display font-medium text-[1.55rem] md:text-[2rem] leading-[1.2] tracking-[-0.01em] text-[color:var(--charcoal)] mb-5"
        >
          {heading.split("travel guides")[0]}
          <span className="font-serif italic text-[color:var(--teal)]">
            travel guides
          </span>
          {heading.split("travel guides")[1] ?? ""}
        </h2>
        <p className="text-[14.5px] md:text-[15.5px] text-[color:var(--charcoal-soft)] leading-[1.75]">
          {intro}
        </p>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
        {mentions.map((m) => {
          const isBrand = m.mentionType === "brand-direct";
          const badge = isBrand
            ? "Mentions YES Experiences"
            : m.mentionType === "best-list"
              ? "Best-of ranking"
              : "Featured the tour we operate";

          return (
            <li
              key={m.id}
              className="flex flex-col p-6 bg-[color:var(--sand)]/55 border border-[color:var(--gold-soft)]/40 hover:bg-[color:var(--sand)] transition-colors"
            >
              <span
                className={
                  "self-start mb-3 inline-block px-2.5 py-1 text-[10.5px] uppercase tracking-[0.22em] " +
                  (isBrand
                    ? "bg-[color:var(--teal)] text-[color:var(--ivory)]"
                    : "bg-[color:var(--ivory)] text-[color:var(--charcoal-soft)] border border-[color:var(--gold-soft)]/60")
                }
              >
                {badge}
              </span>

              <p className="font-display font-semibold text-[15.5px] leading-[1.45] text-[color:var(--charcoal)] mb-3">
                {m.articleTitle}
              </p>

              <blockquote className="text-[13.5px] leading-[1.7] text-[color:var(--charcoal-soft)] italic mb-4 border-l-2 border-[color:var(--gold-soft)] pl-3">
                "{m.quote}"
              </blockquote>

              <div className="mt-auto flex items-center justify-between text-[11.5px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                <span>{m.sourceName}</span>
                <a
                  href={m.articleUrl}
                  target="_blank"
                  rel="noopener nofollow"
                  className="text-[color:var(--teal)] hover:text-[color:var(--gold)] transition-colors"
                  aria-label={`Read the article on ${m.sourceName}`}
                >
                  Read article →
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 md:mt-10 text-center text-[12px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]/80">
        External articles · opens in a new tab
      </p>
    </section>
  );
}
