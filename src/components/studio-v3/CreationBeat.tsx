// Studio V3 — Creation Storytelling layer (Phase 1: AtmosphereBeat).
//
// A short cinematic overlay shown automatically after non-strong choices
// (Who, Occasion) to make the Studio feel responsive between questions.
// Renders INSIDE the existing ReactionOverlay button wrapper, so the
// parent already handles fixed positioning, click/Escape dismiss, the
// auto-dissolve timeout and prefers-reduced-motion skip.
//
// No new images. No new APIs. No backend. No map data. Atmosphere only.

interface AtmosphereBeatProps {
  /** Existing Studio V3 atmospheric image (must already be imported upstream). */
  imageSrc?: string;
  /** Uppercase gold eyebrow label. */
  eyebrow: string;
  /** One short Georgia italic line. Sentence case, no superlatives. */
  line: string;
}

export function AtmosphereBeat({ imageSrc, eyebrow, line }: AtmosphereBeatProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center px-6">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "saturate(0.92) contrast(1.04) brightness(0.6)",
          }}
        />
      ) : null}

      {/* Editorial dark wash so ivory text always meets 4.5:1. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--charcoal) 55%, transparent) 0%, color-mix(in oklab, var(--charcoal) 78%, transparent) 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[480px] text-center">
        <p
          className="text-[10.5px] uppercase tracking-[0.28em] font-semibold"
          style={{ color: "var(--gold)" }}
        >
          <span aria-hidden>—</span> {eyebrow}
        </p>
        <p
          className="mt-5 text-[22px] sm:text-[26px] leading-[1.35] italic text-balance"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--ivory)",
            animation: "studioV3RiseIn 620ms ease-out both",
            animationDelay: "120ms",
          }}
        >
          {line}
        </p>
      </div>
    </div>
  );
}
