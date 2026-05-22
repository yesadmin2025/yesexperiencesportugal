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
  /** Stronger overlay when text sits on top. */
  veil?: "light" | "medium" | "deep";
}

const MOOD_GRADIENTS: Record<string, string> = {
  slow: "radial-gradient(ellipse at 30% 60%, oklch(0.42 0.04 200 / 0.9), oklch(0.22 0.03 220 / 1) 70%)",
  curious: "radial-gradient(ellipse at 70% 40%, oklch(0.48 0.08 80 / 0.85), oklch(0.24 0.04 30 / 1) 75%)",
  romantic: "radial-gradient(ellipse at 50% 70%, oklch(0.45 0.1 30 / 0.9), oklch(0.22 0.05 350 / 1) 75%)",
  open: "radial-gradient(ellipse at 60% 30%, oklch(0.55 0.06 220 / 0.85), oklch(0.28 0.03 240 / 1) 75%)",
  energetic: "radial-gradient(ellipse at 40% 50%, oklch(0.52 0.12 50 / 0.9), oklch(0.25 0.05 20 / 1) 75%)",
  _default: "radial-gradient(ellipse at 50% 60%, oklch(0.4 0.04 200 / 0.85), oklch(0.2 0.03 230 / 1) 75%)",
};

function gradientFor(mood?: string | null) {
  return (mood && MOOD_GRADIENTS[mood]) || MOOD_GRADIENTS._default;
}

export function AmbientStage({ mood, regionLabel, imageUrl, veil = "medium" }: Props) {
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

  const veilOpacity = veil === "light" ? 0.25 : veil === "deep" ? 0.55 : 0.4;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
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
      {/* Optional real image, gently desaturated */}
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
      {/* Subtle vignette for cinematic feel */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, oklch(0.15 0.02 240 / 0.35) 100%)",
        }}
      />
      {regionLabel && (
        <span className="sr-only">Ambient scene · {regionLabel}</span>
      )}
    </div>
  );
}
