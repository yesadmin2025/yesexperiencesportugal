import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import type { SignatureTour } from "@/data/signatureTours";

/**
 * TourEditorialNote — the local-stories reading experience, on a Signature day
 * page: why we designed the day, the rhythm it keeps, and two moments people
 * remember. Conversion actions live only at the top and close of the page.
 *
 * Every sentence is assembled from authoritative tour data (region, duration,
 * pace, fitsBest, blurb and the real stop stories). Nothing is invented here.
 */
export function TourEditorialNote({ tour }: { tour: SignatureTour }) {
  const moments = (tour.stops ?? []).filter((s) => s.story).slice(0, 2);
  const pace = (tour.pace ?? []).filter(Boolean);

  return (
    <section className="py-14 md:py-20 bg-[color:var(--sand)]/50 border-y border-[color:var(--border)] reveal">
      <div className="container-x max-w-3xl">
        <Eyebrow flank>From our local desk</Eyebrow>
        <SectionTitle size="compact" spacing="tight">
          Why we designed <SectionTitle.Em>this day</SectionTitle.Em>
        </SectionTitle>

        <div className="prose-longform mt-6 space-y-5 text-[15.5px] leading-[1.8] text-[color:var(--charcoal-soft)]">
          <p>
            <strong className="font-medium text-[color:var(--charcoal)]">
              {tour.duration} in {tour.region}.
            </strong>{" "}
            {tour.blurb}
          </p>
          <p>
            It fits {tour.fitsBest.charAt(0).toLowerCase() + tour.fitsBest.slice(1)}.
            {pace.length > 0
              ? ` The rhythm we hold is ${pace.join(", ").toLowerCase()} — private guide, private vehicle, no group to wait for.`
              : " Private guide, private vehicle, no group to wait for."}
          </p>
        </div>

        {moments.length > 0 && (
          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {moments.map((m) => (
              <article
                key={m.label}
                className="rounded-[6px] border border-[color:var(--border)] bg-[color:var(--ivory)] p-5"
              >
                <h3
                  className="serif text-[17px] leading-snug text-[color:var(--charcoal)] font-normal"
                  data-mixed-emphasis="exempt"
                >
                  {m.label}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.75] text-[color:var(--charcoal-soft)]">
                  {m.story}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default TourEditorialNote;
