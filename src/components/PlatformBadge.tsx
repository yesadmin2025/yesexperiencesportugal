/**
 * PlatformBadge — official brand marks for the trust bar.
 *
 * Rendered in a premium monochrome treatment: original platform colors are
 * neutralized via CSS filters so Google, Tripadvisor, Viator, GetYourGuide
 * and Trustpilot all read as soft charcoal marks. This keeps the trust row
 * curated and editorial — never a marketplace badge wall.
 *
 * Each platform gets a per-mark optical scale so square monograms (Google,
 * Tripadvisor, GetYourGuide) and wide wordmarks (Viator, Trustpilot)
 * read at the same visual weight in a single row.
 */

import googleLogo from "@/assets/platform-google.webp";
import tripadvisorLogo from "@/assets/platform-tripadvisor.webp";
import viatorLogo from "@/assets/platform-viator.webp";
import getyourguideLogo from "@/assets/platform-getyourguide.webp";
import trustpilotLogo from "@/assets/platform-trustpilot.svg";

export type Platform = "google" | "tripadvisor" | "viator" | "getyourguide" | "trustpilot";

// Per-mark optical scale relative to the container height. Tightened
// for the refined trust strip — all marks now sit between 0.7 and 1.0
// of the row height so no single mark dominates.
const SOURCES: Record<Platform, { src: string; label: string; scale: number }> = {
  google: { src: googleLogo, label: "Google", scale: 0.92 },
  tripadvisor: { src: tripadvisorLogo, label: "Tripadvisor", scale: 0.92 },
  viator: { src: viatorLogo, label: "Viator", scale: 0.58 },
  getyourguide: { src: getyourguideLogo, label: "GetYourGuide", scale: 0.92 },
  trustpilot: { src: trustpilotLogo, label: "Trustpilot", scale: 0.72 },
};

// Monochrome treatment: strip color, lift midtones, and tone toward soft
// charcoal (var(--charcoal-soft)) so every mark reads as a single neutral weight.
// `brightness(0)` collapses the artwork to pure black, then `invert(.42)`
// lifts it to ~#6B charcoal. Slight contrast boost preserves edge clarity
// on small marks. Hover deepens to dark charcoal (var(--charcoal)) for a quiet
// premium response.
const MONO_FILTER = "brightness(0) invert(0.42) contrast(1.05)";
const MONO_FILTER_HOVER = "brightness(0) invert(0.18) contrast(1.05)";

export function PlatformBadge({
  platform,
  className = "",
}: {
  platform: Platform;
  className?: string;
}) {
  const { src, label, scale } = SOURCES[platform];
  return (
    <img
      src={src}
      alt={`${label} — official review platform`}
      loading="lazy"
      decoding="async"
      style={{
        height: `${scale * 100}%`,
        filter: MONO_FILTER,
        transition: "filter var(--dur-quick) ease, opacity var(--dur-quick) ease",
        opacity: 0.7,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = MONO_FILTER_HOVER;
        e.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = MONO_FILTER;
        e.currentTarget.style.opacity = "0.7";
      }}
      className={`block w-auto object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
