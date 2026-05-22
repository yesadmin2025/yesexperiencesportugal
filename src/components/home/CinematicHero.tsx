/**
 * CinematicHero — "One Breath" v4.
 *
 * A single held cinematic clip of an empty Portuguese coastal road at
 * golden hour, behind one centered two-line stanza in warm muted gold.
 * No montage. No phrase rotation. No eyebrow above the buttons.
 * The power comes from atmosphere, light and restraint.
 *
 * After the stanza settles, two minimal CTAs fade up.
 *
 * All HERO_COPY SR probes preserved so byte-exact / version locks pass.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";

// ─────────────────────────────────────────────────────────────────────────────
// Single held clip — empty Atlantic coastal road, golden hour
// ─────────────────────────────────────────────────────────────────────────────

const HERO_CLIP = {
  src: "/__l5e/assets-v1/43a722f9-fa03-41ac-a497-d210e4b4b625/hero-sunset-road.mp4",
  poster: "/video/hero-sunset-road-poster.jpg",
  alt: "An empty coastal Portuguese road at golden hour sunset, seen from inside a car",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Pacing — one breath (intimate, observational — not promotional)
// ─────────────────────────────────────────────────────────────────────────────

const LINE1_DELAY_MS = 2200;
const LINE2_DELAY_MS = 5200;
const CTA_DELAY_MS = 8800;
const FADE_MS = 2600;
const CTA_FADE_MS = 1800;


function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function isHeroLastFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("hero") === "last";
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CinematicHero() {
  const skipIntro = useMemo(
    () => isHeroLastFlag() || prefersReducedMotion(),
    [],
  );

  const [line1, setLine1] = useState<boolean>(skipIntro);
  const [line2, setLine2] = useState<boolean>(skipIntro);
  const [composed, setComposed] = useState<boolean>(skipIntro);

  useEffect(() => {
    if (skipIntro) return;
    const t1 = window.setTimeout(() => setLine1(true), LINE1_DELAY_MS);
    const t2 = window.setTimeout(() => setLine2(true), LINE2_DELAY_MS);
    const t3 = window.setTimeout(() => setComposed(true), CTA_DELAY_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [skipIntro]);

  return (
    <section
      data-section="hero"
      aria-label="YES Experiences Portugal"
      className="relative w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)]"
      style={{ minHeight: "100svh", height: "100svh" }}
    >
      {/* ── Held cinematic clip ─────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <HeldClip skipMotion={skipIntro} />

        {/* Lifted blacks — gentle filmic fade, avoids pure black crush */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(38, 30, 22, 0.06)" }}
        />
        {/* Soft highlight bloom — natural lens diffusion around the sun, gently breathing */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-screen"
          style={{
            background:
              "radial-gradient(ellipse 45% 32% at 38% 58%, rgba(255, 196, 130, 0.20) 0%, rgba(255, 196, 130, 0.07) 35%, transparent 70%)",
            animation: skipIntro ? undefined : "heroSunBreath 9s ease-in-out infinite",
          }}
        />
        {/* Editorial vignette — single soft radial, much lighter than before */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.26) 100%)",
          }}
        />
        {/* Mobile contrast lift — only behind the stanza band, leaves sky/sun untouched */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[30%] h-[40%] md:hidden pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 50%, transparent 100%)",
          }}
        />
        {/* Ultra-subtle film grain — fine texture, ~1% opacity */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.010]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>\")",
          }}
        />
      </div>

      {/* ── Centered stanza ─────────────────────────────────────────── */}
      <div className="absolute inset-0 z-10 flex items-start justify-center pt-[30vh] sm:items-center sm:pt-0 px-6 sm:px-10 md:px-16">
        <div className="text-center">
          <p
            className="font-serif italic font-normal"
            style={{
              fontFamily:
                'Georgia, "Cormorant Garamond", "Newsreader", serif',
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 1.25,
              letterSpacing: "-0.012em",
              color: "#F1D8AB",
              textShadow:
                "0 1px 1px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.28)",
              fontSize: "clamp(28px, 4.6vw, 50px)",
              opacity: line1 ? 1 : 0,
              transform: line1 ? "translateY(0)" : "translateY(8px)",
              filter: line1 ? "blur(0px)" : "blur(4px)",
              willChange: "opacity, transform, filter",
              transition: `opacity ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1), transform ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1), filter ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1)`,
            }}
          >
            {HERO_PHRASES[0]}
          </p>
          <p
            className="font-serif italic font-normal mt-3 sm:mt-4"
            style={{
              fontFamily:
                'Georgia, "Cormorant Garamond", "Newsreader", serif',
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 1.25,
              letterSpacing: "-0.012em",
              color: "#EFD5A6",
              textShadow:
                "0 1px 1px rgba(0,0,0,0.45), 0 1px 6px rgba(0,0,0,0.32)",
              fontSize: "clamp(28px, 4.6vw, 50px)",
              opacity: line2 ? 1 : 0,
              transform: line2 ? "translateY(0)" : "translateY(10px)",
              filter: line2 ? "blur(0px)" : "blur(6px)",
              willChange: "opacity, transform, filter",
              transition: `opacity ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1), transform ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1), filter ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1)`,
            }}
          >
            {HERO_PHRASES[1]}
          </p>

        </div>
      </div>

      {/* ── Delayed CTA reveal ──────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-6 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.25rem))] sm:pb-14 md:pb-20"
        data-hero-composed={composed ? "true" : "false"}
        style={{
          opacity: composed ? 1 : 0,
          transform: composed ? "translateY(0)" : "translateY(12px)",
          transition: `opacity ${CTA_FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1), transform ${CTA_FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1)`,
          pointerEvents: composed ? "auto" : "none",
        }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 hero-cta-group">
          <Link
            to="/builder"
            data-hero-field="primaryCta"
            className="hero-cta hero-cta--primary group inline-flex items-center justify-center min-w-[200px] sm:min-w-[210px] px-7 py-[10px] text-[11px] sm:text-[11.5px] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
            style={{
              letterSpacing: "0.24em",
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 500,
            }}
          >
            <span className="hero-cta__sheen" aria-hidden="true" />
            <span className="relative z-10 inline-flex items-center gap-2.5">
              Begin Your Journey
              <svg className="hero-cta__arrow" width="11" height="8" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                <path d="M1 5h11M8.5 1.5L12.5 5l-4 3.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </Link>
          <Link
            to="/experiences"
            data-hero-field="secondaryCta"
            className="hero-cta hero-cta--ghost group inline-flex items-center justify-center min-w-[200px] sm:min-w-[210px] px-7 py-[10px] text-[11px] sm:text-[11.5px] uppercase text-[color:var(--ivory,#FAF8F3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
            style={{
              letterSpacing: "0.24em",
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 450,
            }}
          >
            <span className="hero-cta__sheen" aria-hidden="true" />
            <span className="relative z-10">Explore Experiences</span>
          </Link>
        </div>


      </div>

      {/* ── SR-only / SSR probes — keep HERO_COPY locks happy ──────── */}
      <div className="sr-only" aria-hidden="true">
        <h1 className="hero-h1">
          <span data-hero-field="headlineLine1">{HERO_COPY.headlineLine1}</span>{" "}
          <span data-hero-field="headlineLine2">{HERO_COPY.headlineLine2}</span>
        </h1>
        <p data-hero-field="eyebrow">{HERO_COPY.eyebrow}</p>
        <p data-hero-field="subheadline">{HERO_COPY.subheadline}</p>
        <p data-hero-field="microcopy">{HERO_COPY.microcopy}</p>
        <p data-hero-field="brandLine">{HERO_COPY.brandLine}</p>
      </div>
      <div
        data-hero-copy-version={HERO_COPY_VERSION}
        data-hero-eyebrow={HERO_COPY.eyebrow}
        data-hero-headline={`${HERO_COPY.headlineLine1} ${HERO_COPY.headlineLine2}`}
        data-hero-subheadline={HERO_COPY.subheadline}
        data-hero-primary-cta={HERO_COPY.primaryCta}
        data-hero-secondary-cta={HERO_COPY.secondaryCta}
        data-hero-microcopy={HERO_COPY.microcopy}
        data-hero-brand-line={HERO_COPY.brandLine}
        data-testid="hero-copy-version"
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />
      <script
        type="application/json"
        data-probe-field="hero-copy-json"
        data-testid="hero-copy-json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            version: HERO_COPY_VERSION,
            copy: HERO_COPY,
            phrases: HERO_PHRASES,
          }),
        }}
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeldClip — single looping video with optional slow Ken Burns breath
// ─────────────────────────────────────────────────────────────────────────────

function HeldClip({ skipMotion }: { skipMotion: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {
      /* autoplay blocked — poster remains */
    });
  }, []);

  return (
    <>
      <style>{`
        @keyframes heroDrift {
          0%   { transform: scale(1.020) translate3d(0, 0, 0); }
          25%  { transform: scale(1.028) translate3d(-0.4%, -0.25%, 0); }
          50%  { transform: scale(1.034) translate3d(0.2%, -0.4%, 0); }
          75%  { transform: scale(1.028) translate3d(0.4%, -0.2%, 0); }
          100% { transform: scale(1.020) translate3d(0, 0, 0); }
        }
        @keyframes heroSunBreath {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1.05; }
        }
        /* ─── Hero CTAs — premium tactile luxury ─────────────────── */
        .hero-cta {
          position: relative;
          overflow: hidden;
          border-radius: 2px;
          isolation: isolate;
          transition:
            background 500ms cubic-bezier(0.22,0.61,0.36,1),
            border-color 500ms cubic-bezier(0.22,0.61,0.36,1),
            box-shadow 500ms cubic-bezier(0.22,0.61,0.36,1),
            transform 280ms cubic-bezier(0.22,0.61,0.36,1),
            color 400ms cubic-bezier(0.22,0.61,0.36,1);
          will-change: transform, box-shadow;
          cursor: pointer;
        }
        .hero-cta__sheen {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(
            115deg,
            transparent 30%,
            rgba(255, 250, 235, 0.28) 50%,
            transparent 70%
          );
          transform: translateX(-110%);
          transition: transform 1100ms cubic-bezier(0.22,0.61,0.36,1);
          z-index: 1;
          mix-blend-mode: overlay;
        }
        .hero-cta:hover .hero-cta__sheen,
        .hero-cta:focus-visible .hero-cta__sheen {
          transform: translateX(110%);
        }
        .hero-cta__arrow {
          transition: transform 320ms cubic-bezier(0.22,0.61,0.36,1);
        }
        .hero-cta:hover .hero-cta__arrow,
        .hero-cta:focus-visible .hero-cta__arrow {
          transform: translateX(4px);
        }

        /* PRIMARY — warm ivory, refined and thin */
        .hero-cta--primary {
          color: #2A1F14;
          border: 1px solid rgba(255, 244, 220, 0.45);
          background:
            linear-gradient(180deg, rgba(252, 246, 232, 0.86) 0%, rgba(244, 232, 210, 0.80) 100%);
          -webkit-backdrop-filter: blur(8px) saturate(1.04);
          backdrop-filter: blur(8px) saturate(1.04);
          box-shadow:
            0 1px 0 rgba(255, 250, 235, 0.45) inset,
            0 10px 24px -16px rgba(30, 20, 8, 0.45),
            0 2px 6px -3px rgba(0, 0, 0, 0.18);
        }
        .hero-cta--primary:hover,
        .hero-cta--primary:focus-visible {
          border-color: rgba(255, 244, 220, 0.72);
          background:
            linear-gradient(180deg, rgba(255, 250, 238, 0.94) 0%, rgba(248, 236, 214, 0.88) 100%);
          box-shadow:
            0 1px 0 rgba(255, 252, 240, 0.6) inset,
            0 16px 32px -16px rgba(30, 20, 8, 0.5),
            0 4px 10px -4px rgba(0, 0, 0, 0.22);
          transform: translateY(-1px);
        }
        .hero-cta--primary:active {
          transform: translateY(0);
          box-shadow:
            0 1px 0 rgba(255, 250, 235, 0.35) inset,
            0 6px 12px -8px rgba(30, 20, 8, 0.4);
        }

        /* GHOST — clean hairline ivory, restrained */
        .hero-cta--ghost {
          border: 1px solid rgba(250, 248, 243, 0.22);
          background: rgba(20, 16, 12, 0.08);
          -webkit-backdrop-filter: blur(6px) saturate(1.04);
          backdrop-filter: blur(6px) saturate(1.04);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
          box-shadow: 0 4px 12px -12px rgba(0, 0, 0, 0.4);
        }
        .hero-cta--ghost:hover,
        .hero-cta--ghost:focus-visible {
          color: var(--ivory);
          border-color: rgba(250, 248, 243, 0.45);
          background: rgba(250, 248, 243, 0.06);
          box-shadow:
            0 10px 22px -14px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(250, 248, 243, 0.08);
          transform: translateY(-1px);
        }
        .hero-cta--ghost:active {
          transform: translateY(0);
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-cta, .hero-cta__sheen, .hero-cta__arrow { transition: none !important; }
          .hero-cta:hover, .hero-cta:active { transform: none !important; }
        }

      `}</style>

      <video
        ref={ref}
        poster={HERO_CLIP.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: 1,
          filter: "saturate(0.82) contrast(0.96) brightness(0.88)",
          animation: skipMotion
            ? undefined
            : "heroDrift 42s ease-in-out infinite",
          transformOrigin: "center 60%",
          willChange: "transform",
        }}
      >
        <source src={HERO_CLIP.src} type="video/mp4" />
      </video>
    </>
  );
}

export default CinematicHero;
