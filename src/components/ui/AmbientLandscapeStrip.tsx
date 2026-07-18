/**
 * AmbientLandscapeStrip — editorial 3-up strip of landscape photos used
 * as a secondary, place-driven trust block on conversion pages.
 *
 * Rules:
 *   • Every photo is unique across the site (no cross-page repeats).
 *   • 3:2 landscape crop, aspect locked.
 *   • Restrained editorial settle + hover, disabled by reduced motion.
 *   • Fraunces caption (place, not experience).
 */

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { buildResponsiveSrc } from "@/lib/responsive-image";
import { MapPin } from "lucide-react";

import espichelCliffs from "@/assets/ambient/cabo-espichel-cliffs.jpg.asset.json";
import espichelSunset from "@/assets/ambient/sunset-pine-cliffs.jpg.asset.json";
import vicentineBay from "@/assets/ambient/01-cover-turquoise-bay-palm.jpg.asset.json";
import vicentineCove from "@/assets/ambient/02-hidden-cove-rocks.jpg.asset.json";
import vicentineIlha from "@/assets/ambient/03-ilha-do-pessegueiro.jpg.asset.json";
import portinhoAerial from "@/assets/owner-photos/portinho-aerial-bay.jpeg.asset.json";
import corkHarvesters from "@/assets/owner-photos/cork-harvesters-alentejo.jpeg.asset.json";
import tastingFlight from "@/assets/owner-photos/tasting-flight-full.jpeg.asset.json";
import potterWheel from "@/assets/owner-photos/potter-wheel-azeitao.jpeg.asset.json";

export interface AmbientPhoto {
  src: string;
  alt: string;
  caption: string;
}

// -------------------------------------------------------------------
// Preset selections — every photo appears in EXACTLY ONE preset.
// -------------------------------------------------------------------

export const CORPORATE_LANDSCAPES: AmbientPhoto[] = [
  {
    src: corkHarvesters.url,
    alt: "Two Alentejo cork harvesters working beside a mature cork oak",
    caption: "Cork harvest, Alentejo",
  },
  {
    src: espichelCliffs.url,
    alt: "Dramatic white cliffs of Cabo Espichel above the Atlantic",
    caption: "Cabo Espichel",
  },
  {
    src: potterWheel.url,
    alt: "An Azeitão potter shaping clay by hand at the workshop wheel",
    caption: "Azeitão, at the potter's wheel",
  },
];

export const PROPOSAL_LANDSCAPES: AmbientPhoto[] = [
  {
    src: espichelSunset.url,
    alt: "Sun setting behind a lone pine over the Espichel cliffs",
    caption: "Cabo Espichel, at sunset",
  },
  {
    src: vicentineCove.url,
    alt: "Hidden cove framed by ochre rock, Southwest Vicentine Coast",
    caption: "A hidden cove",
  },
  {
    src: portinhoAerial.url,
    alt: "Aerial view of Portinho da Arrábida, with turquoise water and wooded cliffs",
    caption: "Portinho da Arrábida",
  },
];

export const MULTIDAY_LANDSCAPES: AmbientPhoto[] = [
  {
    src: vicentineIlha.url,
    alt: "Ilha do Pessegueiro seen from the Southwest Vicentine Coast",
    caption: "Ilha do Pessegueiro",
  },
  {
    src: tastingFlight.url,
    alt: "A tasting flight of Portuguese wines prepared at a local cellar",
    caption: "Setúbal wine country",
  },
  {
    src: vicentineBay.url,
    alt: "Turquoise bay framed by palm fronds, Southwest Vicentine Coast",
    caption: "Southwest Coast",
  },
];

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

interface Props {
  eyebrow: string;
  title: React.ReactNode;
  intro?: string;
  photos: AmbientPhoto[];
}

export function AmbientLandscapeStrip({ eyebrow, title, intro, photos }: Props) {
  const cols =
    photos.length >= 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : photos.length === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";

  return (
    <section className="py-14 md:py-24 bg-[color:var(--ivory)] reveal">
      <div className="container-x">
        <div className="max-w-2xl">
          <Eyebrow icon={<MapPin strokeWidth={1.8} />}>{eyebrow}</Eyebrow>
          <span className="gold-rule mt-4 max-w-[64px]" aria-hidden="true" />
          <SectionTitle size="compact" spacing="loose">
            {title}
          </SectionTitle>
          {intro ? (
            <p className="mt-5 text-[color:var(--charcoal-soft)] leading-relaxed">
              {intro}
            </p>
          ) : null}
        </div>

        <ul
          className={`mt-10 md:mt-14 grid grid-cols-1 ${cols} gap-4 md:gap-6`}
          data-testid="ambient-landscape-strip"
        >
          {photos.map((p, i) => {
            const r = buildResponsiveSrc(p.src, { sizes: "card" });
            return (
               <li key={`${p.src}-${i}`} className="reveal-stagger group">
                 <figure className="overflow-hidden">
                  <div className="overflow-hidden">
                    <img
                      src={r.src}
                      srcSet={r.srcSet}
                      sizes={r.sizes}
                      alt={p.alt}
                      loading="lazy"
                      decoding="async"
                      width={1600}
                      height={1067}
                       className="editorial-photo-motion w-full aspect-[3/2] object-cover"
                       style={{ transitionDelay: `${i * 45}ms` }}
                    />
                  </div>
                  <figcaption className="mt-3 serif text-[0.95rem] text-[color:var(--charcoal)] leading-tight">
                    {p.caption}
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
