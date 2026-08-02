/**
 * SignatureRouteMapFallback — static SVG map shown when Leaflet tiles fail
 * to load in preview. Uses the same stop coord system as the builder's
 * PremiumMap (viewBox 0 0 100 130) so numbering and geography stay honest.
 */

import { snapStop, REGION_CENTROIDS } from "@/data/stopCoords";
import type { SignatureTour } from "@/data/signatureTours";

interface Props {
  tour: SignatureTour;
  reason?: string;
}

function regionKey(region: string): string {
  const r = region.toLowerCase();
  if (r.includes("porto") || r.includes("douro")) return "porto";
  if (r.includes("algarve") || r.includes("vicentine")) return "algarve";
  if (r.includes("alentejo") || r.includes("évora") || r.includes("evora") || r.includes("centro"))
    return "alentejo";
  return "lisbon";
}

export function SignatureRouteMapFallback({ tour, reason }: Props) {
  const region = regionKey(tour.region);
  const points = (tour.stops ?? []).slice(0, 12).map((s, i) => snapStop(s.label, region, i));

  const centroid = REGION_CENTROIDS[region] ?? REGION_CENTROIDS.lisbon;
  const path =
    points.length >= 2
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      : null;

  return (
    <div
      className="w-full aspect-[4/3] md:aspect-[16/9] bg-[color:var(--sand)] relative"
      role="img"
      aria-label={`Route map (offline preview) for ${tour.title} — ${points.length} stops across ${tour.region}`}
    >
      <svg
        viewBox="0 0 100 130"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        aria-hidden
      >
        {/* Portugal silhouette hint */}
        <path
          d="M22 6 L46 4 L58 18 L54 40 L64 62 L60 82 L52 102 L44 118 L32 124 L18 118 L14 96 L20 74 L14 52 L18 28 Z"
          fill="var(--ivory)"
          stroke="var(--gold)"
          strokeOpacity="0.35"
          strokeWidth="0.5"
        />
        {/* Region halo */}
        <circle cx={centroid.x} cy={centroid.y} r={12} fill="var(--gold)" fillOpacity="0.05" />
        {/* Route path */}
        {path && (
          <path
            d={path}
            fill="none"
            stroke="var(--teal)"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1.6 1.4"
            opacity="0.75"
          />
        )}
        {/* Pins */}
        {points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={2.4}
              fill="var(--ivory)"
              stroke="var(--gold)"
              strokeWidth="0.5"
            />
            <text
              x={p.x}
              y={p.y + 0.9}
              textAnchor="middle"
              fontSize="2"
              fontWeight="600"
              fill="var(--teal)"
              fontFamily="ui-sans-serif,system-ui"
            >
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute bottom-2 right-2 text-[9.5px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)] bg-[color:var(--ivory)]/90 px-2 py-1 rounded border border-[color:var(--gold)]/30">
        Offline preview map{reason ? ` · ${reason}` : ""}
      </div>
    </div>
  );
}
