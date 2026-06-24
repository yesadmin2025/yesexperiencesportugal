// Studio V3 — Creation Storytelling layer.
//
// AtmosphereBeat: image + italic line, used for Who / Occasion.
// MapBeat: cinematic homepage-style map panel (delegates to
//   StudioV3SignatureMap — the shared visual language used between
//   questions AND in the final Signature reveal).
//
// Both beats render INSIDE the existing ReactionOverlay button wrapper, which
// already handles fixed positioning, click/Escape dismiss, auto-dissolve and
// prefers-reduced-motion.

import { useState } from "react";
import { StudioV3SignatureMap } from "./StudioV3SignatureMap";
import { lookupStopGeo } from "@/lib/studio/stop-lookup";
import { REGION_ORIGIN, type RegionKey } from "@/data/regionStops";
import { useRouteLegMinutes, type RouteLegStop } from "@/hooks/use-route-leg-minutes";
import type { SilhouetteRegion } from "./PortugalSilhouette";


interface AtmosphereBeatProps {
  /** Existing Studio V3 atmospheric image (must already be imported upstream). */
  imageSrc?: string;
  /**
   * Optional cinematic clip URL. When provided, the canvas swaps from a
   * still JPG to a looping muted scene — Portugal arrives under the
   * question instead of beside it. The image still acts as the poster /
   * reduced-motion fallback, so SSR and slow networks degrade gracefully.
   */
  videoSrc?: string;
  /** Uppercase gold eyebrow label. */
  eyebrow: string;
  /** One short Georgia italic line. Sentence case, no superlatives. */
  line: string;
}

export function AtmosphereBeat({ imageSrc, videoSrc, eyebrow, line }: AtmosphereBeatProps) {
  // Gate the italic reveal on image-load so the line never appears over an
  // unpainted hero on slow networks. If there is no image, or the image
  // fails, we still show the line — never trap the beat behind a missing
  // asset. A short min-hold ensures the animation reads even when cached.
  const [imgReady, setImgReady] = useState<boolean>(!imageSrc);
  const [videoReady, setVideoReady] = useState<boolean>(!videoSrc);
  const ready = imgReady || videoReady;
  return (
    <div
      className="relative w-full h-full flex items-center justify-center px-6 overflow-hidden"
      data-testid="studio-v3-atmosphere-beat"
      data-has-video={videoSrc ? "true" : "false"}
    >
      {/* Scoped Ken Burns keyframes — slow, restrained pan/scale so the
          canvas breathes under each beat without distracting from copy.
          Disabled by prefers-reduced-motion via the utility class below. */}
      <style>{`
        @keyframes sv3KenBurns {
          0%   { transform: scale(1.04) translate3d(0,0,0); }
          100% { transform: scale(1.10) translate3d(-1.2%, -0.8%, 0); }
        }
        .sv3-kenburns { animation: sv3KenBurns 18s ease-out both; transform-origin: 50% 52%; will-change: transform; }
        @media (prefers-reduced-motion: reduce) {
          .sv3-kenburns { animation: none !important; transform: none !important; }
        }
      `}</style>
      {/* Poster layer — JPG behind the video so users see something
          premium before the clip first frame paints. */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          aria-hidden
          onLoad={() => setImgReady(true)}
          onError={() => setImgReady(true)}
          className="absolute inset-0 w-full h-full object-cover sv3-kenburns"
          style={{
            filter: "saturate(0.92) contrast(1.04) brightness(0.6)",
            opacity: imgReady ? 1 : 0,
            transition: "opacity 380ms ease",
          }}
        />
      ) : null}
      {/* Cinematic clip — autoplaying, muted, looping, scoped to the beat.
          motion-reduce hides it so the still poster stays in charge. */}
      {videoSrc ? (
        <video
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoReady(true)}
          className="absolute inset-0 w-full h-full object-cover motion-reduce:hidden sv3-kenburns"
          style={{
            filter: "saturate(0.85) contrast(1.04) brightness(0.62)",
            opacity: videoReady ? 1 : 0,
            transition: "opacity 620ms ease",
          }}
          data-testid="studio-v3-atmosphere-video"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : null}

      {/* Editorial dark wash so ivory text always meets 4.5:1. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--charcoal) 50%, transparent) 0%, color-mix(in oklab, var(--charcoal) 78%, transparent) 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[480px] text-center">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold inline-flex items-center justify-center gap-1.5"
          style={{ color: "var(--gold)" }}
          data-testid="studio-v3-voice-mark"
        >
          <span className="font-bold tracking-[0.32em]" style={{ color: "var(--ivory)" }}>
            YES
          </span>
          <span aria-hidden>—</span>
          <span>{eyebrow}</span>
        </p>
        <p
          className="mt-5 text-[22px] sm:text-[26px] leading-[1.35] italic text-balance"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--ivory)",
            opacity: ready ? 1 : 0,
            animation: ready ? "studioV3RiseIn 620ms ease-out 120ms both" : undefined,
            transition: "opacity 360ms ease",
          }}
        >
          {line}
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- MapBeat ----------------------------- */

export type MapBeatMode = "origin" | "pins" | "pace";

interface MapBeatProps {
  mode: MapBeatMode;
  /** Pickup city label, e.g. "Lisbon" or "Cascais". */
  originLabel?: string | null;
  /** Real route labels from resolveStudioV3Route. Never invented. */
  routeLabels?: ReadonlyArray<string>;
  /** Optional region key — drives origin coords for geographic projection. */
  regionKey?: RegionKey | null;
  /** Optional explicit origin coordinate (overrides regionKey default). */
  originCoord?: { lat: number; lng: number } | null;
  /** Drives pin count cadence for mode="pace". */
  rhythm?: "slow" | "balanced" | "full" | "immersive" | null;
  /** Uppercase gold eyebrow. */
  eyebrow: string;
  /** One Georgia italic line. */
  line: string;
}


/** Pin count by rhythm — slow = fewer, full/immersive = richer. */
function pinCountForRhythm(rhythm: MapBeatProps["rhythm"]): number {
  switch (rhythm) {
    case "slow":
      return 2;
    case "balanced":
      return 3;
    case "full":
      return 4;
    case "immersive":
      return 4;
    default:
      return 3;
  }
}

export function MapBeat({
  mode,
  originLabel,
  routeLabels,
  regionKey,
  originCoord: originCoordProp,
  rhythm,
  eyebrow,
  line,
}: MapBeatProps) {
  // Pin reveal count per mode/rhythm — drives the schematic activeCount.
  const labels = routeLabels ?? [];
  const activeCount =
    mode === "origin"
      ? 0
      : mode === "pins"
        ? Math.min(4, labels.length)
        : Math.min(pinCountForRhythm(rhythm), labels.length);

  const paceLabel =
    mode === "pace"
      ? rhythm === "slow"
        ? "Slow"
        : rhythm === "balanced"
          ? "Balanced"
          : rhythm === "full"
            ? "Full"
            : rhythm === "immersive"
              ? "Immersive"
              : null
      : null;

  // Resolve real coords for each label (catalog lookup). Falls back to
  // schematic mode automatically if any label can't be geo-resolved.
  const stopsDetailed = labels.map((l) => {
    const geo = lookupStopGeo(l);
    if (geo) {
      return {
        label: l,
        lat: geo.lat,
        lng: geo.lng,
        dwellMin: geo.dwellMin,
        kind: geo.kind,
      };
    }
    return { label: l };
  });
  const originCoord =
    originCoordProp ??
    (regionKey && REGION_ORIGIN[regionKey]
      ? { lat: REGION_ORIGIN[regionKey].lat, lng: REGION_ORIGIN[regionKey].lng }
      : null);

  // Real OSRM-backed minutes per leg (origin → s0 → s1 …). Falls back
  // silently to haversine inside StudioV3SignatureMap while loading or
  // when offline. Only fires when we have origin + all visible coords.
  const legStops: RouteLegStop[] | null =
    originCoord && stopsDetailed.every((d) => typeof d.lat === "number" && typeof d.lng === "number")
      ? [
          { key: "origin", lat: originCoord.lat, lng: originCoord.lng },
          ...stopsDetailed.slice(0, activeCount).map((d, i) => ({
            key: `s${i}:${d.label}`,
            lat: d.lat as number,
            lng: d.lng as number,
          })),
        ]
      : null;
  const { legMinutes } = useRouteLegMinutes(legStops, !!legStops && legStops.length >= 2);

  // Map regionKey → silhouette region so the Portugal anchor appears
  // even on the Pickup beat (mode="origin", no stops yet).
  const silhouetteRegion: SilhouetteRegion =
    regionKey === "alentejo"
      ? "alentejo"
      : regionKey === "arrabida"
        ? "arrabida"
        : regionKey === "lisbon-coast"
          ? "lisbon-coast"
          : regionKey === "centro"
            ? "centro"
            : null;



  return (
    <div
      className="relative w-full h-full flex items-center justify-center px-5"
      data-testid="studio-v3-map-beat"
      data-map-beat-mode={mode}
      data-beat-rendered="true"
      data-origin-coord={originCoord ? `${originCoord.lat.toFixed(4)},${originCoord.lng.toFixed(4)}` : "none"}
      data-active-stops={activeCount}
    >
      <div className="relative z-10 w-full max-w-[480px]">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold flex items-center justify-center gap-1.5"
          style={{ color: "var(--gold)" }}
          data-testid="studio-v3-voice-mark"
        >
          <span className="font-bold tracking-[0.32em]" style={{ color: "var(--charcoal)" }}>
            YES
          </span>
          <span aria-hidden>—</span>
          <span>{eyebrow}</span>
        </p>

        {/* Cinematic map stage — shared visual language with homepage Studio
            preview and final Signature reveal. */}
        <div className="mt-5 mx-auto" style={{ animation: "studioV3RiseIn 680ms ease-out both" }}>
          <StudioV3SignatureMap
            stops={labels.length > 0 ? labels : originLabel ? [originLabel] : []}
            stopsDetailed={stopsDetailed}
            originCoord={originCoord}
            originLabel={originLabel ?? null}
            activeCount={activeCount}
            paceLabel={paceLabel}
            aspectRatio="16 / 11"
            legMinutes={legMinutes}
            silhouetteRegion={silhouetteRegion}
            ariaLabel={
              mode === "origin"
                ? `The day begins in ${originLabel ?? "the chosen pickup"}.`
                : `Route forming with ${activeCount} stop${activeCount === 1 ? "" : "s"}.`
            }
          />
        </div>


        {/* Real route labels caption — quiet ivory row. */}
        {activeCount > 0 && labels.length > 0 ? (
          <p
            className="mt-3 text-[11px] leading-[1.45] text-center"
            style={{
              color: "color-mix(in oklab, var(--ivory) 78%, transparent)",
              animation: "studioV3RiseIn 640ms ease-out 1100ms both",
            }}
          >
            {labels
              .slice(0, activeCount)
              .map((l) => l.split(/[—–-]/)[0].split(",")[0].trim())
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}

        <p
          className="mt-4 text-[18px] sm:text-[22px] leading-[1.35] italic text-balance text-center"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--ivory)",
            animation: "studioV3RiseIn 680ms ease-out 480ms both",
          }}
        >
          {line}
        </p>
      </div>
    </div>
  );
}
