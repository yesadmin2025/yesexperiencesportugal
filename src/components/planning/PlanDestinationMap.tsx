import { useMemo } from "react";
import { EditorialMap, type EditorialMapStop } from "@/components/maps/EditorialMap";
import { lookupStopGeo } from "@/lib/studio/stop-lookup";
import { useRouteLegMinutes, type RouteLegStop } from "@/hooks/use-route-leg-minutes";
import type { SignatureTour } from "@/data/signatureTours";

interface Props {
  /** The primary Signature tour anchoring this destination — its stops drive the map. */
  tour: SignatureTour;
  /** Regional caption shown along the map bottom (e.g. "Setúbal · Arrábida"). */
  regionLabel: string;
}

/**
 * PlanDestinationMap — geographic route preview for a Plan destination page.
 *
 * Reuses the canonical `<EditorialMap>` for visual identity (route draws in,
 * pins fade sequenced, ivory core on the last pin). Coordinates come from the
 * real `REGION_STOPS` catalog via `lookupStopGeo` — never invented. Drive-time
 * chips are populated with real OSRM minutes via `useRouteLegMinutes`, so the
 * distances a traveller sees match what they'd actually experience.
 *
 * If fewer than two stops resolve to real coordinates, the component renders
 * nothing (no placeholder map, no fabricated geography).
 */
export function PlanDestinationMap({ tour, regionLabel }: Props) {
  const resolved = useMemo(() => {
    const out: { label: string; lat: number; lng: number }[] = [];
    for (const s of tour.stops) {
      const geo = lookupStopGeo(s.label);
      if (!geo) continue;
      out.push({ label: s.label, lat: geo.lat, lng: geo.lng });
    }
    // Dedupe consecutive identical coords (some tours revisit an anchor).
    return out.filter(
      (p, i, arr) => i === 0 || p.lat !== arr[i - 1].lat || p.lng !== arr[i - 1].lng,
    );
  }, [tour.stops]);

  const legStops = useMemo<RouteLegStop[]>(
    () => resolved.map((s, i) => ({ key: `${tour.id}-${i}`, lat: s.lat, lng: s.lng })),
    [resolved, tour.id],
  );
  const { legMinutes } = useRouteLegMinutes(legStops, resolved.length >= 2);

  if (resolved.length < 2) return null;

  const mapStops: EditorialMapStop[] = resolved.map((s) => ({
    label: s.label,
    lat: s.lat,
    lng: s.lng,
  }));

  const totalMin = (legMinutes ?? []).reduce<number>(
    (acc, m) => acc + (typeof m === "number" ? m : 0),
    0,
  );
  const footerRight =
    totalMin > 0
      ? `${resolved.length} stops · ${Math.round(totalMin)} min drive`
      : `${resolved.length} stops`;

  return (
    <EditorialMap
      stops={mapStops}
      legMinutes={legMinutes ?? undefined}
      eyebrow="Where you'll go"
      meta={regionLabel}
      caption={tour.title}
      footerRight={footerRight}
      tone="dark"
      aspectRatio="4 / 5"
      className="w-full h-full rounded-sm"
      ariaLabel={`Route map for ${tour.title} — ${resolved.length} stops across ${regionLabel}`}
    />
  );
}
