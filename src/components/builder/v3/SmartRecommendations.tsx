import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import type { DriftLocale } from "@/lib/drift/i18n";
import { recordDriftEvent } from "@/lib/drift/telemetry";

/**
 * SmartRecommendations — 1-click alternative Signature tours.
 *
 * Rules of the house:
 *  - Only real SignatureTour entries from the active catalog (no inventions).
 *  - Excludes the anchor that already drives the reveal.
 *  - Scores by profile fit (style ↔ theme/styles, pickup ↔ seed.region,
 *    radius ↔ duration, energy ↔ seed.pace). Up to 2 cards.
 *  - One tap → /tours/$tourId (the canonical Signature page). No modal,
 *    no second screen. Telemetry tracks the swap intent.
 *  - Editorial restraint: ivory card, gold hairline, no chips, no parallax,
 *    no shimmer. fade-in entry only.
 */

type Profile = {
  pickup?: "lisbon" | "centro" | "alentejo";
  radius?: "near" | "far" | "anywhere";
  energy?: "slow" | "vivid";
  style?: "coast" | "heritage" | "wine" | "table";
};

interface Props {
  anchor: SignatureTour;
  profile: Profile;
  locale: DriftLocale;
  /** Optional: limit to N recommendations (default 2). */
  max?: number;
}

const COPY: Record<
  DriftLocale,
  { eyebrow: string; subtitle: string; from: string; perGuest: string; cta: string }
> = {
  pt: {
    eyebrow: "também combina consigo",
    subtitle: "Outras experiências reais que encaixam neste mesmo ritmo.",
    from: "desde",
    perGuest: "por pessoa",
    cta: "Ver experiência",
  },
  en: {
    eyebrow: "also fits you",
    subtitle: "Other real experiences that share this same rhythm.",
    from: "from",
    perGuest: "per guest",
    cta: "Open experience",
  },
  es: {
    eyebrow: "también encaja con usted",
    subtitle: "Otras experiencias reales con el mismo ritmo.",
    from: "desde",
    perGuest: "por persona",
    cta: "Ver experiencia",
  },
  fr: {
    eyebrow: "vous correspond aussi",
    subtitle: "D'autres expériences réelles au même rythme.",
    from: "à partir de",
    perGuest: "par personne",
    cta: "Découvrir",
  },
};

/** Map the drift style dimension onto the SignatureTour tags we score against. */
const STYLE_MATCH: Record<NonNullable<Profile["style"]>, { themes: string[]; styles: string[] }> = {
  coast: { themes: ["Coastal"], styles: ["coastal", "coast", "boat", "beach"] },
  heritage: { themes: ["Heritage"], styles: ["heritage", "history", "monastery"] },
  wine: { themes: ["Wine"], styles: ["wine", "tasting"] },
  table: { themes: ["Gastronomy", "Wine"], styles: ["gastronomy", "table", "tasting"] },
};

function scoreTour(t: SignatureTour, profile: Profile): number {
  let s = 0;
  // Style ↔ theme (strongest signal)
  if (profile.style) {
    const m = STYLE_MATCH[profile.style];
    if (m.themes.includes(t.theme)) s += 3;
    const overlap = (t.seed.styles ?? []).some((sty) => m.styles.includes(sty));
    if (overlap) s += 1.5;
  }
  // Pickup region
  if (profile.pickup && t.seed.region) {
    if (t.seed.region === profile.pickup) s += 1.8;
    else if (profile.pickup === "lisbon" && t.seed.region === "lisbon") s += 1;
  }
  // Energy ↔ pace
  if (profile.energy && t.seed.pace) {
    if (profile.energy === "slow" && t.seed.pace === "relaxed") s += 0.8;
    if (profile.energy === "vivid" && t.seed.pace === "full") s += 0.8;
    if (t.seed.pace === "balanced") s += 0.3;
  }
  // Radius ↔ duration
  if (profile.radius && t.seed.duration) {
    if (profile.radius === "far" && t.seed.duration === "fullday") s += 0.6;
    if (profile.radius === "near" && t.seed.duration !== "fullday") s += 0.6;
  }
  // Gentle nudge so excellent themes still surface when explicit signals are sparse
  if (!profile.style && !profile.pickup) s += 0.2;
  return s;
}

export function SmartRecommendations({ anchor, profile, locale, max = 2 }: Props) {
  const t = COPY[locale] ?? COPY.en;
  const [seen] = useState(() => new Set<string>());

  const picks = useMemo(() => {
    const ranked = signatureTours
      .filter((tour) => tour.id !== anchor.id)
      .map((tour) => ({ tour, score: scoreTour(tour, profile) }))
      .filter((r) => r.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .map((r) => r.tour);
    return ranked;
  }, [anchor.id, profile, max]);

  if (picks.length === 0) return null;

  return (
    <section
      aria-label={t.eyebrow}
      className="mt-10 w-full max-w-[640px] mx-auto animate-in fade-in duration-500 motion-reduce:animate-none"
    >
      <header className="flex flex-col items-center text-center gap-2 mb-5">
        <span
          className="text-[10.5px] uppercase tracking-[0.32em] font-semibold"
          style={{ color: "var(--gold)" }}
        >
          {t.eyebrow}
        </span>
        <p
          className="text-[13px] italic max-w-[42ch]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
        >
          {t.subtitle}
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {picks.map((tour) => {
          if (!seen.has(tour.id)) {
            seen.add(tour.id);
            void recordDriftEvent("reveal_shown", {
              meta: { kind: "smart_reco_shown", tourId: tour.id, anchorId: anchor.id },
            });
          }
          return (
            <li
              key={tour.id}
              className="group rounded-[6px] overflow-hidden border bg-[color:var(--ivory)] transition-shadow hover:shadow-[0_14px_38px_rgba(0,0,0,0.12)] motion-reduce:transition-none"
              style={{ borderColor: "color-mix(in oklab, var(--gold) 35%, transparent)" }}
            >
              <Link
                to="/tours/$tourId"
                params={{ tourId: tour.id }}
                onClick={() =>
                  void recordDriftEvent("cta_book", {
                    meta: { kind: "smart_reco_click", tourId: tour.id, anchorId: anchor.id },
                  })
                }
                className="flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
                aria-label={`${tour.title} — ${t.from} €${tour.priceFrom} ${t.perGuest}`}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={tour.img}
                    alt={tour.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-[420ms] ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    style={{ objectPosition: tour.focal ?? "50% 50%", filter: "saturate(0.94)" }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                    style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.45))" }}
                  />
                  <span
                    className="absolute top-2 left-2 inline-flex items-center rounded-[2px] px-2 py-1 text-[9.5px] uppercase tracking-[0.22em] font-bold"
                    style={{ background: "var(--ivory)", color: "var(--teal)" }}
                  >
                    {tour.theme}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <h3
                    className="text-[14.5px] leading-tight font-semibold"
                    style={{ fontFamily: "Montserrat, system-ui, sans-serif", color: "var(--charcoal)" }}
                  >
                    {tour.title}
                  </h3>
                  <p
                    className="text-[11px] uppercase tracking-[0.18em] font-medium"
                    style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
                  >
                    {tour.region} · {tour.durationHours}
                  </p>
                  <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
                    <span
                      className="text-[12.5px]"
                      style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
                    >
                      <span className="opacity-70">{t.from} </span>
                      <span style={{ fontWeight: 700, color: "var(--charcoal)" }}>€{tour.priceFrom}</span>
                      <span className="opacity-70"> · {t.perGuest}</span>
                    </span>
                    <span
                      className="text-[10.5px] uppercase tracking-[0.28em] font-bold inline-flex items-center gap-1"
                      style={{ color: "var(--teal)" }}
                    >
                      {t.cta} →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
