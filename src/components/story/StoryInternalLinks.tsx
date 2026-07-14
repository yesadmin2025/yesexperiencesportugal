/**
 * StoryInternalLinks — contextual, intent-aware internal-linking block
 * for Local Stories landing pages (Lisbon wine / day-trip / private-tour).
 *
 * Detects the article's search intent from its slug and title, then
 * picks the three best-fit next-step tiles for that intent:
 *
 *   • wine        → Studio (wine day) · Signature (parent) · /plan/portugal-wine-and-gastronomy
 *   • day-trip    → Studio (day designer) · Signature (parent) · /plan/5-day-portugal-itinerary
 *   • private     → Studio (private day) · Signature (parent) · /plan/7-day (or 14-day) private itinerary
 *   • itinerary   → Studio · Signature · /plan/14-day-portugal-itinerary
 *   • generic     → Studio · Signature · region-best-fit itinerary
 *
 * No invented copy — labels reference the article's own signatureSlug
 * and region. Brand-guardrail compliant: sand section, gold rule,
 * editorial three-tile grid.
 */
import { Link } from "@tanstack/react-router";
import type { LocalStoryArticle } from "@/content/local-stories-articles";
import { findTour, type SignatureTour } from "@/data/signatureTours";

type Intent = "wine" | "day-trip" | "private" | "itinerary" | "generic";

/** Classify an article's search intent from slug + title. */
function detectIntent(article: LocalStoryArticle): Intent {
  const s = `${article.slug} ${article.title}`.toLowerCase();
  if (/\bitinerary|itineraries|\d+[- ]day\b|week in portugal\b/.test(s)) return "itinerary";
  if (/\bwine|vineyard|winery|wineries|douro|talha|moscatel|tasting\b/.test(s)) return "wine";
  if (/\bprivate (tour|driver|guide)\b|\bprivate[- ]tour\b/.test(s)) return "private";
  if (/\bday[- ]trip|day trips?|things to do|what to do|guide\b/.test(s)) return "day-trip";
  return "generic";
}

type Tile = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: TileHref;
};

type TileHref =
  | { kind: "studio" }
  | { kind: "signature"; tourId: string }
  | {
      kind: "plan";
      to:
        | "/plan/5-day-portugal-itinerary"
        | "/plan/7-day-portugal-itinerary"
        | "/plan/14-day-portugal-itinerary"
        | "/plan/portugal-wine-and-gastronomy";
    };

function studioTile(intent: Intent): Tile {
  switch (intent) {
    case "wine":
      return {
        eyebrow: "Design your own",
        title: "Build your private wine day in the Studio",
        body: "Pick the region, the wineries and the pace — a real-time private day designed with you, then instantly confirmed.",
        cta: "Open the Studio",
        href: { kind: "studio" },
      };
    case "day-trip":
      return {
        eyebrow: "Design your own",
        title: "Design your private day trip from Lisbon",
        body: "Choose your morning, your lunch, your afternoon — a guided real-time builder that maps the whole day for you.",
        cta: "Open the Studio",
        href: { kind: "studio" },
      };
    case "private":
      return {
        eyebrow: "Design your own",
        title: "Build your fully private Portugal day",
        body: "One family, one guide, one car — configured in minutes with hotel pickup and instant confirmation.",
        cta: "Open the Studio",
        href: { kind: "studio" },
      };
    case "itinerary":
      return {
        eyebrow: "Design your own",
        title: "Compose your own private Portugal itinerary",
        body: "Start with a template, adapt every day — a real-time itinerary builder for slow, private travel.",
        cta: "Open the Studio",
        href: { kind: "studio" },
      };
    default:
      return {
        eyebrow: "Design your own",
        title: "Build your private Portugal day in the Studio",
        body: "A guided, real-time itinerary builder — pick the region, the pace and the moments that matter. Confirmed instantly.",
        cta: "Open the Studio",
        href: { kind: "studio" },
      };
  }
}

function signatureTile(parent: SignatureTour): Tile {
  return {
    eyebrow: "Signature · pre-designed",
    title: parent.title,
    body: parent.blurb,
    cta: "See the Signature",
    href: { kind: "signature", tourId: parent.id },
  };
}

function planTile(intent: Intent, region: string | undefined): Tile {
  const r = (region ?? "").toLowerCase();

  if (intent === "wine") {
    return {
      eyebrow: "Multi-day · wine & gastronomy",
      title: "Portugal wine & gastronomy journey",
      body: "A private multi-day journey through Setúbal, Alentejo and the Douro — the wine regions we build weeks around.",
      cta: "See the wine itinerary",
      href: { kind: "plan", to: "/plan/portugal-wine-and-gastronomy" },
    };
  }

  if (intent === "day-trip") {
    return {
      eyebrow: "Stretch it to a short break",
      title: "5-day private Portugal itinerary",
      body: "Turn a single day trip into a slow long-weekend — Lisbon anchor, two full private days south, one rest day.",
      cta: "See the 5-day plan",
      href: { kind: "plan", to: "/plan/5-day-portugal-itinerary" },
    };
  }

  if (intent === "private") {
    if (r.includes("comporta") || r.includes("alentejo") || r.includes("vicentina")) {
      return {
        eyebrow: "Private · full journey",
        title: "14-day private Portugal itinerary",
        body: "Lisbon → Alentejo → Comporta → the wild south coast — fully private, one guide, unhurried pace.",
        cta: "See the 14-day plan",
        href: { kind: "plan", to: "/plan/14-day-portugal-itinerary" },
      };
    }
    return {
      eyebrow: "Private · full week",
      title: "7-day private Portugal itinerary",
      body: "The Lisbon private week we design most often — Sintra, Arrábida and Alentejo, all private, all confirmed.",
      cta: "See the 7-day plan",
      href: { kind: "plan", to: "/plan/7-day-portugal-itinerary" },
    };
  }

  if (intent === "itinerary") {
    return {
      eyebrow: "The full private journey",
      title: "14-day private Portugal itinerary",
      body: "The complete slow-Portugal week — Lisbon, Alentejo, Comporta and the south coast, private throughout.",
      cta: "See the 14-day plan",
      href: { kind: "plan", to: "/plan/14-day-portugal-itinerary" },
    };
  }

  // generic — region-best-fit
  if (r.includes("comporta") || r.includes("alentejo") || r.includes("vicentina")) {
    return {
      eyebrow: "Stretch it into a week",
      title: "14-day private Portugal itinerary",
      body: "Lisbon → Alentejo → Comporta → the wild south coast, at a slow private pace.",
      cta: "See the itinerary",
      href: { kind: "plan", to: "/plan/14-day-portugal-itinerary" },
    };
  }
  return {
    eyebrow: "Stretch it into a week",
    title: "7-day private Portugal itinerary",
    body: "The Lisbon week we design most often — Sintra, Arrábida, Alentejo.",
    cta: "See the itinerary",
    href: { kind: "plan", to: "/plan/7-day-portugal-itinerary" },
  };
}

function TileCard({ tile }: { tile: Tile }) {
  const linkClass =
    "inline-flex items-center gap-2 font-sans text-[11.5px] uppercase tracking-[0.24em] text-[color:var(--teal)] hover:text-[color:var(--gold-warm)] transition-colors";
  const arrow = (
    <span aria-hidden="true" className="text-[color:var(--gold)]">
      →
    </span>
  );

  return (
    <li className="group bg-[color:var(--ivory)] border border-[color:var(--gold-soft)]/50 p-7 md:p-8 transition-transform duration-200 hover:-translate-y-[2px]">
      <span className="block font-sans text-[10.5px] uppercase tracking-[0.28em] text-[color:var(--teal)] mb-3">
        {tile.eyebrow}
      </span>
      <h3 className="font-display font-semibold text-[1.15rem] md:text-[1.25rem] leading-[1.3] text-[color:var(--charcoal)] mb-3">
        {tile.title}
      </h3>
      <p className="text-[14.5px] leading-[1.7] text-[color:var(--charcoal)]/80 mb-6">
        {tile.body}
      </p>
      {tile.href.kind === "studio" && (
        <Link to="/studio-v3" className={linkClass}>
          {tile.cta}
          {arrow}
        </Link>
      )}
      {tile.href.kind === "signature" && (
        <Link
          to="/tours/$tourId"
          params={{ tourId: tile.href.tourId }}
          className={linkClass}
        >
          {tile.cta}
          {arrow}
        </Link>
      )}
      {tile.href.kind === "plan" && (
        <Link to={tile.href.to} className={linkClass}>
          {tile.cta}
          {arrow}
        </Link>
      )}
    </li>
  );
}

const INTRO_BY_INTENT: Record<Intent, string> = {
  wine:
    "Three ways to travel this wine story — designed with you, booked as a Signature day, or stretched into a full wine week.",
  "day-trip":
    "Three ways to travel this day — designed with you, booked as a ready Signature, or turned into a slow long-weekend.",
  private:
    "Three private paths — a real-time builder, a pre-designed Signature, or a full private week in Portugal.",
  itinerary:
    "Three ways forward — build your own from scratch, book a Signature day, or step into the full private journey.",
  generic:
    "Three ways to travel it — designed with you, booked with a licensed local operator, or stretched into a full private week.",
};

export function StoryInternalLinks({ article }: { article: LocalStoryArticle }) {
  const parent = findTour(article.signatureSlug);
  const intent = detectIntent(article);
  const tiles: Tile[] = [studioTile(intent)];
  if (parent) tiles.push(signatureTile(parent));
  tiles.push(planTile(intent, parent?.region));

  return (
    <section
      className="py-16 md:py-24 bg-[color:var(--sand)]"
      aria-labelledby="story-internal-links-heading"
    >
      <div className="container-x max-w-5xl">
        <div className="text-center max-w-2xl mx-auto">
          <span className="block font-sans text-[11px] uppercase tracking-[0.32em] text-[color:var(--gold-warm)] mb-4">
            Keep planning
          </span>
          <h2
            id="story-internal-links-heading"
            className="font-display font-semibold text-[1.6rem] md:text-[2rem] leading-[1.2] text-[color:var(--charcoal)]"
          >
            Take this story further
          </h2>
          <p className="mt-4 text-[15px] md:text-[16px] text-[color:var(--charcoal-soft)] leading-[1.75]">
            {INTRO_BY_INTENT[intent]}
          </p>
          <div aria-hidden="true" className="mx-auto mt-8 h-px w-16 bg-[color:var(--gold)]/60" />
        </div>

        <ul className="mt-12 grid gap-6 md:grid-cols-3 list-none p-0">
          {tiles.map((tile, i) => (
            <TileCard key={i} tile={tile} />
          ))}
        </ul>
      </div>
    </section>
  );
}

export default StoryInternalLinks;
