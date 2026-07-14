import { Link } from "@tanstack/react-router";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { TourImage } from "@/components/tours/TourImage";
import { useImportedTourImages } from "@/hooks/use-imported-tour-images";
import type { SignatureTour } from "@/data/signatureTours";
import type { LocalStoryArticle } from "@/content/local-stories-articles";

/**
 * RelatedExperiencesRail — canonical internal-linking block used on
 * every planning page (Signature detail, Local Story, itinerary).
 *
 * Two lanes, both optional:
 *   - `tours`  → related Signature experiences (image cards)
 *   - `stories` → related Local Stories (compact editorial links)
 *
 * Recommendations are computed by `src/lib/related-experiences.ts` and
 * only ever reference items already in the catalog — never invents.
 * Uses canonical `<Eyebrow>` / `<SectionTitle>` primitives and the
 * existing tour image pipeline so the rail matches site-wide rhythm.
 */
export interface RelatedExperiencesRailProps {
  tours?: SignatureTour[];
  stories?: LocalStoryArticle[];
  /** Eyebrow copy for the tours lane. Defaults to "More like this". */
  toursEyebrow?: string;
  /** Headline for the tours lane. */
  toursTitle?: React.ReactNode;
  /** Eyebrow copy for the stories lane. */
  storiesEyebrow?: string;
  /** Headline for the stories lane. */
  storiesTitle?: React.ReactNode;
  /** Optional wrapper background token. Defaults to --ivory. */
  background?: "ivory" | "sand" | "none";
}

export function RelatedExperiencesRail({
  tours,
  stories,
  toursEyebrow = "More like this",
  toursTitle,
  storiesEyebrow = "Read more from Portugal",
  storiesTitle,
  background = "ivory",
}: RelatedExperiencesRailProps) {
  const hasTours = Array.isArray(tours) && tours.length > 0;
  const hasStories = Array.isArray(stories) && stories.length > 0;
  if (!hasTours && !hasStories) return null;

  const bg =
    background === "sand"
      ? "bg-[color:var(--sand)]"
      : background === "none"
        ? ""
        : "bg-[color:var(--ivory)]";

  return (
    <section
      aria-label="Related experiences and destinations"
      className={`py-16 border-t border-[color:var(--border)] reveal ${bg}`}
    >
      <div className="container-x max-w-5xl">
        {hasTours && (
          <ToursLane
            tours={tours!}
            eyebrow={toursEyebrow}
            title={
              toursTitle ?? (
                <>
                  Other <SectionTitle.Em>Signature Experiences</SectionTitle.Em>
                </>
              )
            }
          />
        )}

        {hasStories && (
          <div className={hasTours ? "mt-16" : ""}>
            <StoriesLane
              stories={stories!}
              eyebrow={storiesEyebrow}
              title={
                storiesTitle ?? (
                  <>
                    From our <SectionTitle.Em>Local Stories</SectionTitle.Em>
                  </>
                )
              }
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ToursLane({
  tours,
  eyebrow,
  title,
}: {
  tours: SignatureTour[];
  eyebrow: string;
  title: React.ReactNode;
}) {
  const { resolveImg } = useImportedTourImages();
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SectionTitle size="compact">{title}</SectionTitle>
      <ul className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.map((t) => (
          <li key={t.id}>
            <Link
              to="/tours/$tourId"
              params={{ tourId: t.id }}
              className="group flex flex-col"
              aria-label={`${t.title} — Signature experience`}
            >
              <TourImage
                {...resolveImg(t, "md")}
                alt={t.title}
                ratio="3/2"
                focal={t.focal ?? "50% 50%"}
                className="mb-3"
                imgClassName="transition-transform duration-700 group-hover:scale-105"
              />
              <h3 className="serif text-lg text-[color:var(--charcoal)]">{t.title}</h3>
              <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] mt-1">
                {t.region}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StoriesLane({
  stories,
  eyebrow,
  title,
}: {
  stories: LocalStoryArticle[];
  eyebrow: string;
  title: React.ReactNode;
}) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SectionTitle size="compact">{title}</SectionTitle>
      <ul className="mt-6 divide-y divide-[color:var(--gold-soft)]/50 border-y border-[color:var(--gold-soft)]/50">
        {stories.map((s) => (
          <li key={s.slug}>
            <Link
              to="/local-stories/$slug"
              params={{ slug: s.slug }}
              className="group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.26em] text-[color:var(--charcoal-soft)]">
                  {s.eyebrow}
                </p>
                <h3 className="serif text-[17px] mt-1 text-[color:var(--charcoal)] group-hover:text-[color:var(--teal)] transition-colors">
                  {s.h1}
                </h3>
              </div>
              <span
                aria-hidden="true"
                className="text-[color:var(--gold)] shrink-0 text-sm mt-1 sm:mt-0"
              >
                Read →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
