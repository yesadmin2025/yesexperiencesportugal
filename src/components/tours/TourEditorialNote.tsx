import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EditorialSources } from "@/components/journal/EditorialSources";
import type { EditorialSource } from "@/components/journal/EditorialSources";
import type { SignatureTour } from "@/data/signatureTours";

// Cultural context belongs beside the verified itinerary, never inside the
// bookable stop list. Recognition describes the place, not an included visit.
const PLACE_CONTEXT: Partial<Record<SignatureTour["id"], { story: string; source?: EditorialSource; guide?: { label: string; url: string } }>> = {
  "sintra-cascais": {
    story: "Sintra is protected as a cultural landscape, not just a collection of palaces. Its 19th-century Romantic architecture brought gardens, woodland and buildings into one setting; the palace choice on this day lets you experience a part of that whole.",
    source: { label: "UNESCO: Cultural Landscape of Sintra", url: "https://whc.unesco.org/en/list/723/" },
    guide: { label: "Explore Sintra's landscape", url: "/local-stories/sintra-day-tour-from-lisbon" },
  },
  "evora-alentejo": {
    story: "Évora's UNESCO-listed center holds Roman remains alongside later streets, chapels and whitewashed houses. The cork stop and wineries bring that historic city into the working landscape of the Alentejo; lunch is at your own expense.",
    source: { label: "UNESCO: Historic Centre of Évora", url: "https://whc.unesco.org/en/list/361/" },
    guide: { label: "Read the Évora guide", url: "/local-stories/evora-private-tour-from-lisbon" },
  },
  "tomar-coimbra": {
    story: "Tomar's UNESCO-listed Convent of Christ preserves the transition from the Knights Templar to the Order of Christ. Coimbra carries the story into Portugal's university tradition; the Joanina Library visit depends on timed entry.",
    source: { label: "UNESCO: Convent of Christ in Tomar", url: "https://whc.unesco.org/en/list/265/" },
    guide: { label: "Read the Tomar and Coimbra guide", url: "/local-stories/tomar-coimbra-day-trip-from-lisbon" },
  },
  "fatima-nazare-obidos": {
    story: "These are three distinct kinds of place: Fátima's living pilgrimage, Nazaré's fishing coast and winter giant-wave setting, and Óbidos's medieval streets. Óbidos is also a UNESCO Creative City of Literature; that recognition describes the town, not an additional stop on this day.",
    source: { label: "UNESCO: Óbidos Creative City of Literature", url: "https://www.unesco.org/en/creative-cities/obidos" },
    guide: { label: "Read the Fátima, Nazaré and Óbidos guide", url: "/local-stories/fatima-day-trip-from-lisbon" },
  },
  "azeitao-cheese": {
    story: "Queijo de Azeitão is a protected-origin sheep's-milk cheese traditionally set with cardoon flower. Its method ties the dairy to local pastures; the hands-on workshop gives that craft a place in the day, followed by regional wine and Sesimbra.",
    source: { label: "Portuguese agriculture authority: Queijo de Azeitão PDO", url: "https://tradicional.dgadr.gov.pt/en/categories/cheese-and-other-dairy-products/37-queijo-de-azeitao-pdo" },
    guide: { label: "Explore Setúbal food and wine", url: "/local-stories/setubal-wine-guide" },
  },
  "tiles-workshop": {
    story: "Azulejos are part of Portugal's built environment, not only souvenirs. The tile-painting workshop in Sesimbra makes the brushwork behind the familiar blue-and-white surfaces tangible; the day also explores Setúbal wine country and the coast.",
    guide: { label: "Explore Setúbal's local culture", url: "/local-stories/setubal-wine-guide" },
  },
  "arrabida-wine-allinclusive": {
    story: "The Setúbal peninsula brings together Arrábida's limestone ridge, Atlantic coast and wine country. Moscatel de Setúbal belongs to this landscape, while the market and fishing culture give the wine day its everyday setting.",
    guide: { label: "Read the Setúbal wine guide", url: "/local-stories/setubal-wine-guide" },
  },
  "arrabida-boat": {
    story: "Sesimbra is a working fishing town beneath the Arrábida ridge. From the water the cliffs and coves read differently than they do by road, connecting the harbor to the protected coast around it.",
    guide: { label: "Read the Sesimbra guide", url: "/local-stories/what-to-do-in-sesimbra" },
  },
  "wild-beaches-picnic": {
    story: "Arrábida's protected hills meet small Atlantic coves close to Sesimbra's fishing harbor. The landscape is the reason for this slower coastal day; beach access and conditions remain weather-dependent.",
  },
  "troia-comporta": {
    story: "Crossing the Sado reaches more than a beach peninsula: Tróia's Roman fish-salting remains, Carrasqueira's working stilt pier and Comporta's rice fields show different ways people have lived with this estuary. Its low-key design culture sits within that landscape, not apart from it.",
    guide: { label: "Read the Comporta guide", url: "/local-stories/troia-comporta-guide" },
  },
  "roman-heritage-alentejo": {
    story: "Vinho de Talha keeps a Roman-rooted method alive in the Alentejo: wine made in large clay vessels. São Cucufate gives the day a Roman setting, while the talha visit shows a tradition still practiced around Vila de Frades; this is not a claim that the modern wine comes from the ruins.",
    guide: { label: "Read the Vinho de Talha story", url: "/local-stories/roman-heritage-alentejo-talha-wines" },
  },
  "southwest-vicentine-coast": {
    story: "The protected southwest coast is a landscape of cliffs, river mouths and fishing villages rather than a string of resorts. Porto Covo, Milfontes and Odeceixe give this long private day its changing coastal rhythm; a multi-day journey leaves more time to linger.",
    guide: { label: "Read the Costa Vicentina guide", url: "/local-stories/southwest-vicentine-coast-guide" },
  },
};

/**
 * TourEditorialNote — the local-stories reading experience, on a Signature day
 * page: why we designed the day, the rhythm it keeps, and two moments people
 * remember. Conversion actions live only at the top and close of the page.
 *
 * It pairs verified tour data with a short, separately sourced cultural note;
 * recognition of a destination never implies an extra included stop.
 */
export function TourEditorialNote({ tour }: { tour: SignatureTour }) {
  const moments = (tour.stops ?? []).filter((s) => s.story).slice(0, 2);
  const pace = (tour.pace ?? []).filter(Boolean);
  const context = PLACE_CONTEXT[tour.id];

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

        {context && (
          <div className="prose-longform mt-8 border-t border-[color:var(--border)] pt-6 text-[15px] leading-[1.8] text-[color:var(--charcoal-soft)]">
            <h3 className="serif text-[20px] text-[color:var(--charcoal)]">Why this place matters</h3>
            <p className="mt-3">{context.story}</p>
            {context.guide && <div className="mt-3">
              <a href={context.guide.url} className="text-[13px] underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--teal)]">{context.guide.label} →</a>
            </div>}
            <EditorialSources sources={context.source ? [context.source] : undefined} />
          </div>
        )}

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
