import { useEffect, useState } from "react";

/**
 * Layer 0 — Ambient atmospheric scene.
 *
 * A full-bleed background that crossfades between curated real moods.
 * Uses CSS-only gradients tinted with brand tokens when no image is
 * available, so it always renders (even without DB-backed imagery).
 */

interface Props {
  mood?: string | null;
  regionLabel?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  /** Stronger overlay when text sits on top. */
  veil?: "light" | "medium" | "deep";
  /** Single-day vs multi-day journey — drives tint warmth/depth. */
  journeyType?: "day" | "multi" | null;
  /** Affinity profile (0–1 each) — fine-tunes tint intensity. */
  affinity?: { warmth: number; depth: number; energy: number; intimacy: number };
}

/**
 * MOOD_GRADIENTS — Portuguese atmospheric palettes, not generic dark luxury.
 *
 * Each mood resolves to a specific lived Portuguese light:
 *   · slow      → Atlantic afternoon haze (cool linen + sea-mist)
 *   · curious   → tiled alleyway after rain (azulejo blue + warm lamp)
 *   · romantic  → terracotta dusk inland (warm clay + vineyard shadow)
 *   · open      → coastal noon over Cabo da Roca (silver Atlantic light)
 *   · energetic → late-afternoon market warmth (sun-warmed stone + paprika)
 *
 * Keep hues anchored to brand-board territory (warm ivory + sand + teal +
 * gold) so these read as Portugal, not Mediterranean stock luxury.
 */
const MOOD_GRADIENTS: Record<string, string> = {
  slow: "radial-gradient(ellipse at 35% 65%, oklch(0.52 0.04 220 / 0.75), oklch(0.26 0.03 230 / 1) 72%)",
  curious:
    "radial-gradient(ellipse at 70% 40%, oklch(0.46 0.09 235 / 0.78), oklch(0.22 0.05 245 / 1) 75%)",
  romantic:
    "radial-gradient(ellipse at 50% 70%, oklch(0.48 0.11 45 / 0.82), oklch(0.24 0.06 30 / 1) 75%)",
  open: "radial-gradient(ellipse at 55% 35%, oklch(0.6 0.04 215 / 0.7), oklch(0.3 0.03 225 / 1) 78%)",
  energetic:
    "radial-gradient(ellipse at 45% 55%, oklch(0.54 0.13 55 / 0.85), oklch(0.26 0.06 25 / 1) 75%)",
  _default:
    "radial-gradient(ellipse at 50% 60%, oklch(0.44 0.05 210 / 0.78), oklch(0.22 0.03 230 / 1) 75%)",
};

function gradientFor(mood?: string | null) {
  return (mood && MOOD_GRADIENTS[mood]) || MOOD_GRADIENTS._default;
}

export function AmbientStage({
  mood,
  regionLabel,
  imageUrl,
  videoUrl,
  veil = "medium",
  journeyType,
  affinity,
}: Props) {
  const [currentMood, setCurrentMood] = useState<string | null>(mood ?? null);
  const [prevMood, setPrevMood] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if ((mood ?? null) === currentMood) return;
    setPrevMood(currentMood);
    setCurrentMood(mood ?? null);
    setFading(true);
    const t = window.setTimeout(() => {
      setFading(false);
      setPrevMood(null);
    }, 600);
    return () => window.clearTimeout(t);
  }, [mood, currentMood]);

  const veilOpacity = veil === "light" ? 0.16 : veil === "deep" ? 0.38 : 0.26;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Previous mood layer (fading out) */}
      {prevMood !== null && fading && (
        <div
          className="absolute inset-0 transition-opacity duration-[600ms]"
          style={{
            background: gradientFor(prevMood),
            opacity: 0,
          }}
        />
      )}
      {/* Current mood layer */}
      <div
        className="absolute inset-0 transition-opacity duration-[600ms]"
        style={{
          background: gradientFor(currentMood),
          opacity: 1,
        }}
      />
      {/* Real cinematic footage, gently desaturated */}
      {videoUrl && (
        <video
          key={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] motion-reduce:transition-none"
          style={{ opacity: 0.72, filter: "saturate(0.92) contrast(1.02) brightness(0.92)" }}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {/* Optional real image fallback, gently desaturated */}
      {imageUrl && (
        <img
          key={imageUrl}
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms] motion-reduce:transition-none"
          style={{ opacity: 0.45, filter: "saturate(0.85) contrast(1.02)" }}
          loading="eager"
          decoding="async"
        />
      )}
      {/* Charcoal veil for legibility */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, oklch(0.18 0.02 240 / ${veilOpacity * 0.7}) 0%, oklch(0.18 0.02 240 / ${veilOpacity}) 100%)`,
        }}
      />
      {/* Journey-type + affinity tint —
          single-day journeys lean warm/gold (sunlit, intimate);
          multi-day journeys lean deep teal (immersive, durational).
          Warmth/depth from the affinity profile fine-tunes intensity. */}
      {journeyType && (
        <div
          className="absolute inset-0 transition-opacity duration-[900ms]"
          style={{
            opacity: 0.32 + (affinity?.depth ?? 0.5) * 0.18,
            background:
              journeyType === "multi"
                ? `linear-gradient(155deg, oklch(0.36 0.05 200 / 0.55) 0%, oklch(0.22 0.04 220 / 0.7) 100%)`
                : `radial-gradient(ellipse at 60% 40%, oklch(0.55 0.08 70 / ${0.32 + (affinity?.warmth ?? 0.5) * 0.22}) 0%, transparent 70%)`,
            mixBlendMode: journeyType === "multi" ? "multiply" : "soft-light",
          }}
          aria-hidden="true"
        />
      )}

      {/* Portuguese light layer — a high warm-ivory sun pool in the upper
          third (sun-warmed shutter / café window light) and a cooler
          Atlantic edge fade at the bottom (sea-mist coming in). Keeps the
          scene unmistakably Portugal, never generic Mediterranean. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 18%, oklch(0.9 0.05 80 / 0.14) 0%, transparent 70%)",
          mixBlendMode: "soft-light",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background: "linear-gradient(180deg, transparent 0%, oklch(0.42 0.04 220 / 0.18) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Subtle vignette for cinematic feel */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, oklch(0.15 0.02 240 / 0.22) 100%)",
        }}
      />
      {regionLabel && <span className="sr-only">Ambient scene · {regionLabel}</span>}
    </div>
  );
}
