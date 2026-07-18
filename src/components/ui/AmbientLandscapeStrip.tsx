/**
 * AmbientLandscapeStrip — editorial 3-up strip of landscape photos used
 * as a secondary, place-driven trust block on conversion pages. No CTA,
 * no promise, no invented itineraries — just faithful "settings we work
 * in". Every image is a real photo from the owner's `tour-photos` bank.
 *
 * Layout & motion follow the existing editorial system:
 *   • 3:2 landscape crop, aspect locked
 *   • fade + translateY reveal (≤16px), no parallax outside .home-energy
 *   • Fraunces caption (place, not experience)
 *
 * Use it via one of the exported presets, or pass your own `photos` when
 * a page needs a bespoke selection — presets keep the three main pages
 * visually consistent.
 */

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { buildResponsiveSrc } from "@/lib/responsive-image";
import { MapPin } from "lucide-react";

import comportaBoardwalk from "@/assets/ambient/comporta-boardwalk.jpg.asset.json";
import comportaAerial from "@/assets/ambient/comporta-aerial.jpg.asset.json";
import comportaCabanas from "@/assets/ambient/comporta-cabanas.jpg.asset.json";
import espichelCliffs from "@/assets/ambient/cabo-espichel-cliffs.jpg.asset.json";
import espichelSunset from "@/assets/ambient/sunset-pine-cliffs.jpg.asset.json";
import vicentineBay from "@/assets/ambient/01-cover-turquoise-bay-palm.jpg.asset.json";
import vicentineCove from "@/assets/ambient/02-hidden-cove-rocks.jpg.asset.json";
import vicentineIlha from "@/assets/ambient/03-ilha-do-pessegueiro.jpg.asset.json";

export interface AmbientPhoto {
  src: string;
  alt: string;
  caption: string;
}

// -------------------------------------------------------------------
// Preset selections (place, not experience)
// -------------------------------------------------------------------

export const CORPORATE_LANDSCAPES: AmbientPhoto[] = [
  {
    src: comportaBoardwalk.url,
    alt: "Wooden boardwalk descending to turquoise water — Comporta",
    caption: "Comporta",
  },
  {
    src: espichelCliffs.url,
    alt: "Dramatic white cliffs of Cabo Espichel above the Atlantic",
    caption: "Cabo Espichel",
  },
  {
    src: vicentineBay.url,
    alt: "Turquoise bay framed by palm fronds on the Southwest Vicentine Coast",
    caption: "Southwest Coast",
  },
];

export const PROPOSAL_LANDSCAPES: AmbientPhoto[] = [
  {
    src: espichelSunset.url,
    alt: "Sun setting behind a lone pine over the Espichel cliffs",
    caption: "Cabo Espichel, at sunset",
  },
  {
    src: vicentineBay.url,
    alt: "Turquoise bay framed by palm fronds on the Southwest Vicentine Coast",
    caption: "A private bay, Southwest Coast",
  },
  {
    src: comportaCabanas.url,
    alt: "Comporta beach cabanas with Arrábida on the horizon",
    caption: "Comporta cabanas",
  },
];

export const MULTIDAY_LANDSCAPES: AmbientPhoto[] = [
  {
    src: comportaAerial.url,
    alt: "Aerial view of the long turquoise Comporta coastline",
    caption: "Comporta coast",
  },
  {
    src: vicentineIlha.url,
    alt: "Ilha do Pessegueiro seen from the beach on the Southwest Vicentine Coast",
    caption: "Ilha do Pessegueiro",
  },
  {
    src: espichelCliffs.url,
    alt: "Dramatic white cliffs of Cabo Espichel above the Atlantic",
    caption: "Arrábida & Espichel",
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
          className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6"
          data-testid="ambient-landscape-strip"
        >
          {photos.map((p, i) => {
            const r = buildResponsiveSrc(p.src, { sizes: "card" });
            return (
              <li key={`${p.src}-${i}`} className="reveal-stagger">
                <figure className="overflow-hidden">
                  <img
                    src={r.src}
                    srcSet={r.srcSet}
                    sizes={r.sizes}
                    alt={p.alt}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[3/2] object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
                  />
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
