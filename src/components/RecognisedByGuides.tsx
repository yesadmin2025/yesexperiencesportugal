import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getMentionsForPlacement, type AuthorityPlacement } from "@/data/externalAuthorityMentions";

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
 *  • Citations carry no "Read article" label and no "opens in a new tab"
 *    note — the article title itself links to the original source.
 *  • Quotes and publication names stay verbatim plain text.
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
  homepage: 4,
  "wine-landing": 5,
  "arrabida-tour": 4,
  alentejo: 4,
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
      <div className="editorial-label-stack max-w-2xl mx-auto text-center mb-10 md:mb-12">
        <Eyebrow>Mentions in independent guides</Eyebrow>
        <SectionTitle
          as="h2"
          size="compact"
          spacing="loose"
          id="recognised-by-guides-title"
          className="mb-5"
        >
          {heading.split("travel guides")[0]}
          <SectionTitle.Em>travel guides</SectionTitle.Em>
          {heading.split("travel guides")[1] ?? ""}
        </SectionTitle>
        <p className="text-[15px] md:text-base text-[color:var(--charcoal-soft)] leading-[1.75]">
          {intro}
        </p>
      </div>

      <ul
        className={
          "grid grid-cols-1 gap-5 md:gap-6 max-w-5xl mx-auto " +
          (mentions.length % 3 === 1 ? "md:grid-cols-2 lg:grid-cols-2" : "md:grid-cols-3")
        }
      >
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
                  "self-start mb-3 inline-block px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] " +
                  (isBrand
                    ? "bg-[color:var(--teal)] text-[color:var(--ivory)]"
                    : "bg-[color:var(--ivory)] text-[color:var(--charcoal-soft)] border border-[color:var(--gold-soft)]/60")
                }
              >
                {badge}
              </span>

              <a
                href={m.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-display font-semibold text-[15.5px] leading-[1.45] text-[color:var(--charcoal)] mb-3 underline decoration-[color:var(--gold-soft)] decoration-1 underline-offset-4 transition-colors hover:decoration-[color:var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--teal)]"
              >
                {m.articleTitle}
              </a>

              <blockquote className="font-serif text-[13.5px] leading-[1.7] text-[color:var(--charcoal-soft)] italic mb-4 border-l-2 border-[color:var(--gold-soft)] pl-3">
                "{m.quote}"
              </blockquote>

              <div className="mt-auto text-[11.5px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
                <span>{m.sourceName}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
