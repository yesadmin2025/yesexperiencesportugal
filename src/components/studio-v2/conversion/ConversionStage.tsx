/**
 * Studio v2 — Conversion Stage.
 *
 * The climax of the journey. Reads the AI confidence + itinerary shape
 * via decideConversionPath() and presents one of three cinematic surfaces:
 *
 *   instant  → "Reserve this day" primary, host handoff as quiet tertiary
 *   refine   → Host handoff primary, no instant button (complex / luxury)
 *   both     → Instant + Host presented as equal cinematic choices
 *
 * Replaces the legacy BespokeSecureCTA on the reveal page. Same draft +
 * /checkout/$token plumbing under the hood — only the surface changes.
 */

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { TravelerProfile } from "@/lib/studio-v2/profile";
import type { RefineStop } from "@/components/studio-v2/RefineStage";
import { decideConversionPath, type ItinerarySummary } from "@/lib/studio-v2/conversion-router";
import { EmbeddedConfirmationSheet } from "./EmbeddedConfirmationSheet";
import { HostHandoffPanel } from "./HostHandoffPanel";
import { trackBuilderEvent } from "@/lib/builder-analytics";

interface Props {
  profile: TravelerProfile;
  region: string;
  archetype?: string;
  stops: RefineStop[];
  /** Optional warning flag from the live feasibility chip. */
  hasFeasibilityWarning?: boolean;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function ConversionStage({
  profile,
  region,
  archetype,
  stops,
  hasFeasibilityWarning,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const summary: ItinerarySummary = useMemo(() => {
    let km = 0;
    for (let i = 1; i < stops.length; i++) km += haversineKm(stops[i - 1], stops[i]);
    return {
      stopCount: stops.length,
      allReal: stops.every((s) => (s.source_tour_keys?.length ?? 0) > 0),
      driveMinutes: Math.round((km / 55) * 60),
      hasWarning: !!hasFeasibilityWarning,
    };
  }, [stops, hasFeasibilityWarning]);

  const decision = useMemo(() => decideConversionPath(profile, summary), [profile, summary]);

  // Fire once per decision so we can tune the router from analytics.
  useMemo(() => {
    void trackBuilderEvent("studio_v2_conversion_decision", {
      path: decision.path,
      confidence: Math.round(decision.confidence * 100) / 100,
      reasons: decision.reasons.join("|"),
      stops: stops.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.path]);

  const openSheet = () => {
    void trackBuilderEvent("studio_v2_instant_open", { archetype, region });
    setSheetOpen(true);
  };

  return (
    <div className="mt-12 flex flex-col gap-6">
      {decision.path === "instant" && (
        <>
          <InstantPrimary onClick={openSheet} />
          <div className="mt-1">
            <HostHandoffPanel
              profile={profile}
              region={region}
              archetype={archetype}
              stops={stops}
              emphasis="equal"
            />
          </div>
        </>
      )}

      {decision.path === "refine" && (
        <HostHandoffPanel
          profile={profile}
          region={region}
          archetype={archetype}
          stops={stops}
          emphasis="primary"
        />
      )}

      {decision.path === "both" && (
        <div className="grid grid-cols-1 gap-5">
          <InstantPrimary onClick={openSheet} variant="equal" />
          <p
            className="text-center text-[11px] uppercase tracking-[0.32em]"
            style={{
              color: "color-mix(in oklab, var(--charcoal) 45%, transparent)",
              fontWeight: 600,
            }}
          >
            — or —
          </p>
          <HostHandoffPanel
            profile={profile}
            region={region}
            archetype={archetype}
            stops={stops}
            emphasis="equal"
          />
        </div>
      )}

      <EmbeddedConfirmationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        profile={profile}
        region={region}
        archetype={archetype}
        stops={stops}
      />
    </div>
  );
}

function InstantPrimary({
  onClick,
  variant = "primary",
}: {
  onClick: () => void;
  variant?: "primary" | "equal";
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        className="group inline-flex items-center justify-center gap-2.5 rounded-[2px] px-7 py-4 transition-all focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "color-mix(in oklab, var(--gold) 92%, var(--charcoal))",
          color: "var(--charcoal)",
          minHeight: 56,
          minWidth: 240,
          fontFamily: "var(--font-sans, Inter), sans-serif",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          boxShadow: "0 8px 24px -12px color-mix(in oklab, var(--gold) 60%, transparent)",
        }}
      >
        Reserve this day
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-[3px]"
          aria-hidden
        />
      </button>
      {variant === "primary" && (
        <p
          className="text-center text-[12px] italic"
          style={{
            fontFamily: "Georgia, serif",
            color: "color-mix(in oklab, var(--charcoal) 60%, transparent)",
          }}
        >
          Instant confirmation. A local designer reviews timings before any charge.
        </p>
      )}
    </div>
  );
}
