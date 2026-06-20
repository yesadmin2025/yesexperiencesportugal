import { Compass, MapPin } from "lucide-react";
import { BuilderImage } from "./BuilderImage";

/* ─────────────────────────────────────────────────────────────────
   RegionStep — first picker after entry, before mood.

   The 10 region keys + labels + blurbs below are the EXACT real rows
   from the `builder_regions` table (sort_order ascending). We never
   invent regions; if the table grows, this list should be regenerated
   from the same source. The backing engine (`generateBuilderRoute`)
   already accepts `regionKey` as an input — picking a region here
   simply gates which `builder_stops` the engine considers when
   shaping the day.

   Visual: full-bleed card grid (2 cols on mobile), each card carries
   a subtle teal/gold gradient (no stock imagery — we don't have a
   curated photo per region in the static asset set yet). Cards show
   label + one-line blurb; tap commits the region and advances.
───────────────────────────────────────────────────────────────── */

export const BUILDER_REGIONS = [
  {
    key: "lisbon",
    label: "Lisbon & Coast",
    blurb: "The capital, Sintra's palaces, the Arrábida coast and Setúbal's wine country.",
  },
  {
    key: "arrabida-setubal",
    label: "Arrábida & Setúbal",
    blurb: "Cliffs, oyster beaches, and Portugal's wine cellars an hour from Lisbon.",
  },
  {
    key: "troia-comporta",
    label: "Tróia & Comporta",
    blurb: "Roman ruins, palafitic piers, and rice paddies on the Sado peninsula.",
  },
  {
    key: "porto",
    label: "Porto & Douro",
    blurb: "Riverside Porto, the Douro Valley terraces, port cellars and granite villages.",
  },
  {
    key: "alentejo",
    label: "Alentejo & Centro",
    blurb: "Évora, Monsaraz, cork plains, slow vineyards and the inland heart of Portugal.",
  },
  {
    key: "sintra-cascais",
    label: "Sintra & Cascais",
    blurb: "Romantic palaces, Atlantic capes, and the westernmost point of Europe.",
  },
  {
    key: "algarve",
    label: "Algarve",
    blurb: "Golden cliffs, hidden coves, Ria Formosa, Vicentine wild coast and Monchique hills.",
  },
  {
    key: "evora-alentejo",
    label: "Évora & Alentejo",
    blurb: "Roman temples, cork forests, and Alentejo's slow wine country.",
  },
  {
    key: "centro-tomar-coimbra",
    label: "Tomar & Coimbra",
    blurb: "Templar heritage and Portugal's oldest university north of Lisbon.",
  },
  {
    key: "centro-fatima-nazare-obidos",
    label: "Fátima, Nazaré & Óbidos",
    blurb: "Sanctuary, giant Atlantic waves, and a walled medieval village.",
  },
] as const;

export type BuilderRegionKey = (typeof BUILDER_REGIONS)[number]["key"];

export const BUILDER_REGION_KEYS: BuilderRegionKey[] = BUILDER_REGIONS.map((r) => r.key);

interface Props {
  selected?: BuilderRegionKey;
  onChoose: (key: BuilderRegionKey) => void;
}

export function RegionStep({ selected, onChoose }: Props) {
  return (
    <div className="builder-step-in">
      <div className="flex flex-col gap-3 builder-reveal">
        <span className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.28em] font-semibold text-[color:var(--gold)]">
          <Compass size={12} aria-hidden="true" />
          Where in Portugal
        </span>
        <h2 className="serif text-[1.7rem] sm:text-[2.2rem] md:text-[2.6rem] leading-[1.05] tracking-[-0.01em] font-semibold text-[color:var(--charcoal)]">
          Pick a region to <span className="italic">root</span> your day.
        </h2>
        <p className="max-w-xl text-[13.5px] sm:text-[14px] text-[color:var(--charcoal)]/70 leading-relaxed">
          We'll shape stops, drive times and tastings around this corner of Portugal. You can change
          this later.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Region"
        className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        {BUILDER_REGIONS.map((r) => {
          const isSelected = selected === r.key;
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChoose(r.key)}
              className={[
                "group relative overflow-hidden rounded-[2px] text-left transition-all duration-300 border bg-[color:var(--ivory)]",
                "min-h-[148px] flex flex-col",
                isSelected
                  ? "border-[color:var(--gold)] ring-2 ring-[color:var(--gold)]/35 -translate-y-[2px] shadow-[0_14px_28px_-16px_rgba(46,46,46,0.4)]"
                  : "border-[color:var(--charcoal)]/12 hover:-translate-y-[2px] hover:border-[color:var(--charcoal)]/30 hover:shadow-[0_10px_22px_-14px_rgba(46,46,46,0.3)]",
              ].join(" ")}
            >
              {/* Subtle teal/gold gradient — no stock imagery */}
              <div
                aria-hidden="true"
                className="relative h-20 w-full"
                style={{
                  background:
                    "radial-gradient(120% 90% at 30% 30%, color-mix(in oklab, var(--gold) 18%, transparent) 0%, transparent 60%), linear-gradient(135deg, color-mix(in oklab, var(--teal) 92%, black) 0%, color-mix(in oklab, var(--teal-2) 88%, black) 100%)",
                }}
              >
                <MapPin
                  size={16}
                  aria-hidden="true"
                  className="absolute top-3 left-3 text-[color:var(--gold)]"
                />
              </div>
              <div className="flex-1 p-3 sm:p-4 flex flex-col gap-1">
                <span className="serif text-[15px] sm:text-[16px] leading-[1.15] font-semibold text-[color:var(--charcoal)]">
                  {r.label}
                </span>
                <span className="text-[11.5px] sm:text-[12px] leading-snug text-[color:var(--charcoal)]/65 line-clamp-2">
                  {r.blurb}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-[11.5px] text-[color:var(--charcoal)]/55 tracking-wide">
        Real regions, real stops. We never invent locations.
      </p>

      {/* BuilderImage import kept for tree-shaking parity with other steps;
          intentionally not rendered — region cards use a token-only gradient
          so we don't ship a stock image we don't actually have. */}
      <span className="hidden">
        <BuilderImage src="" alt="" ratio="4/5" />
      </span>
    </div>
  );
}
