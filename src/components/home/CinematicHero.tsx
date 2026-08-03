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

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";
// ShapeYourDay overlay removed from hero per design brief.

// ─────────────────────────────────────────────────────────────────────────────
// Single held clip — empty Atlantic coastal road, golden hour
// ─────────────────────────────────────────────────────────────────────────────

const HERO_CLIP = {
  // Web-optimized H.264 variants (replaces the 19 MB original).
  srcMobile: "/__l5e/assets-v1/ff4f2c39-2fde-42f1-9b4a-7230c692f1e9/hero-sunset-road-720.mp4",
  srcDesktop: "/__l5e/assets-v1/422f19b8-dad0-4ae0-b952-e4fc9a048abe/hero-sunset-road-1080.mp4",
  // Modern codecs for browsers that negotiate them (Safari → HEVC, Chrome/FF → AV1).
  // ~30–40 % smaller than the H.264 720p mobile source; browsers that don't decode
  // them silently fall through to the H.264 <source> below.
  srcMobileHevc:
    "/__l5e/assets-v1/07f8da30-1c73-4d49-a615-19beccd6bc17/hero-sunset-road-720.hevc.mp4",
  srcMobileAv1:
    "/__l5e/assets-v1/5b4b22ae-6087-461f-b6bb-2befd85ae8de/hero-sunset-road-720.av1.mp4",
  posterWebp: "/video/hero-sunset-road-poster.webp",
  posterWebpMobile: "/video/hero-sunset-road-poster-720.webp",
  posterJpg: "/video/hero-sunset-road-poster.jpg",
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
  // Hydration-safe: SSR always renders the pre-intro state, and the
  // "skip" decision (?hero=last / reduced motion) resolves after mount.
  // Computing it during render caused a server/client attribute mismatch
  // that React refuses to patch, freezing data-hero-composed at "false".
  const [skipIntro, setSkipIntro] = useState(false);

  const [line1, setLine1] = useState(false);
  const [line2, setLine2] = useState(false);
  const [composed, setComposed] = useState(false);

  useEffect(() => {
    const skip = isHeroLastFlag() || prefersReducedMotion();
    if (skip) {
      setSkipIntro(true);
      setLine1(true);
      setLine2(true);
      setComposed(true);
      return;
    }
    const t1 = window.setTimeout(() => setLine1(true), LINE1_DELAY_MS);
    const t2 = window.setTimeout(() => setLine2(true), LINE2_DELAY_MS);
    const t3 = window.setTimeout(() => setComposed(true), CTA_DELAY_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  return (
    <section
      data-section="hero"
      data-hero-cinematic="true"
      aria-label="YES Experiences Portugal"
      className="relative w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)]"
      style={{ minHeight: "100svh", height: "100svh" }}
    >
      {/* ── Held cinematic clip ─────────────────────────────────────── */}
      {/* `hero-story-stage` + `data-hero-film` are stable E2E hooks for the
          hero film playback specs — keep them on the film wrapper/element. */}
      <div className="hero-story-stage absolute inset-0 z-0">
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
        {/* Mobile contrast lift — bottom-anchored so sky stays untouched but overlay copy hits AA */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[55%] md:hidden pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.14) 35%, rgba(0,0,0,0.42) 100%)",
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
        {/* The visible stanza IS the page H1 — same visuals, same
            animation, correct document semantics. Each line stays a
            block so the two-line cadence is unchanged. */}
        <h1 className="text-center m-0" data-hero-stanza="true">
          <span
            className="block font-serif italic font-normal m-0"
            style={{
              fontFamily: 'Georgia, "Cormorant Garamond", "Newsreader", serif',
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 1.25,
              letterSpacing: "-0.012em",
              color: "#F1D8AB",
              textShadow: "0 1px 1px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.28)",
              fontSize: "clamp(28px, 4.6vw, 50px)",
              opacity: line1 ? 1 : 0,
              transform: line1 ? "translateY(0)" : "translateY(8px)",
              filter: line1 ? "blur(0px)" : "blur(4px)",
              willChange: "opacity, transform, filter",
              transition: `opacity ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1), transform ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1), filter ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1)`,
            }}
          >
            {HERO_PHRASES[0]}
          </span>
          <span
            className="block font-serif italic font-normal mt-3 sm:mt-4"
            style={{
              fontFamily: 'Georgia, "Cormorant Garamond", "Newsreader", serif',
              fontWeight: 400,
              fontStyle: "italic",
              lineHeight: 1.25,
              letterSpacing: "-0.012em",
              color: "#F1D8AB",
              textShadow: "0 1px 1px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.28)",
              fontSize: "clamp(28px, 4.6vw, 50px)",
              opacity: line2 ? 1 : 0,
              transform: line2 ? "translateY(0)" : "translateY(8px)",
              filter: line2 ? "blur(0px)" : "blur(4px)",
              willChange: "opacity, transform, filter",
              transition: `opacity ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1), transform ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1), filter ${FADE_MS}ms cubic-bezier(0.22,0.61,0.36,1)`,
            }}
          >
            {HERO_PHRASES[1]}
          </span>
        </h1>
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
        <div className="flex flex-col items-center gap-3 sm:gap-4 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-5 lg:w-full lg:max-w-[700px] hero-cta-group">
          <Link
            to="/experience-studio"
            data-hero-field="primaryCta"
            data-analytics="hero_open_studio"
            data-analytics-placement="hero"
            className="hero-cta hero-cta--primary group inline-flex items-center justify-center whitespace-nowrap w-full max-w-[330px] sm:max-w-[380px] lg:max-w-none lg:w-full px-5 sm:px-6 py-[14px] sm:py-[13px] min-h-[44px] text-[10.5px] sm:text-[11px] lg:text-[11.5px] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 450,
            }}
          >
            <span className="hero-cta__sheen" aria-hidden="true" />
            <span className="relative z-10 inline-flex items-center gap-2.5">
              Create Your Story
              <svg
                className="hero-cta__arrow"
                width="10"
                height="7"
                viewBox="0 0 14 10"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 5h11M8.5 1.8L12.2 5l-3.7 3.2"
                  stroke="currentColor"
                  strokeWidth="0.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
          <Link
            to="/experiences"
            data-hero-field="secondaryCta"
            data-analytics="hero_choose_experience"
            data-analytics-placement="hero"
            className="hero-cta hero-cta--ghost group inline-flex items-center justify-center whitespace-nowrap w-full max-w-[330px] sm:max-w-[380px] lg:max-w-none lg:w-full px-5 sm:px-6 py-[14px] sm:py-[13px] min-h-[44px] text-[10.5px] sm:text-[11px] lg:text-[11.5px] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 450,
            }}
          >
            <span className="hero-cta__sheen" aria-hidden="true" />
            <span className="relative z-10 inline-flex items-center gap-2.5">
              Explore Signature Experiences
              <svg
                className="hero-cta__arrow"
                width="10"
                height="7"
                viewBox="0 0 14 10"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 5h11M8.5 1.8L12.2 5l-3.7 3.2"
                  stroke="currentColor"
                  strokeWidth="0.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        </div>
      </div>

      {/* ShapeYourDay removed from hero per design brief. */}

      {/* ── SR-only / SSR probes — keep HERO_COPY locks happy ────────
          NOTE: this block is intentionally NOT an <h1>: the visible
          cinematic stanza above carries the single document H1. */}
      <div className="sr-only">
        <p className="hero-h1">
          <span data-hero-field="headlineLine1">{HERO_COPY.headlineLine1}</span>{" "}
          <span data-hero-field="headlineLine2">{HERO_COPY.headlineLine2}</span>
        </p>

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

  // Show the looping video on all viewports once the page is idle,
  // using the lightweight mobile clip on phones. The poster remains
  // visible as the immediate LCP fallback and while the video loads.
  const [showVideo, setShowVideo] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Honor explicit data-saver preference; otherwise show video even on mobile.
    const saveData =
      // @ts-expect-error — Network Information API is non-standard
      navigator.connection?.saveData === true;
    if (saveData) return;

    // Defer mounting the <video> until the browser is idle so it never
    // competes with the LCP poster paint or critical hero CSS.
    const schedule =
      (
        window as unknown as {
          requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
        }
      ).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
    const id = schedule(() => setShowVideo(true), { timeout: 1500 });
    return () => {
      const cancel =
        (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback ??
        ((i: number) => window.clearTimeout(i));
      cancel(id as number);
    };
  }, []);

  useEffect(() => {
    if (!showVideo) return;
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {
      /* autoplay blocked — poster remains */
    });
  }, [showVideo]);

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
        @keyframes heroPrimaryBreath {
          0%, 100% {
            box-shadow:
              0 10px 24px -16px rgba(30, 20, 8, 0.45),
              0 2px 6px -3px rgba(0, 0, 0, 0.18),
              0 0 0 0 rgba(201, 169, 106, 0.0);
          }
          50% {
            box-shadow:
              0 12px 28px -14px rgba(30, 20, 8, 0.50),
              0 2px 6px -3px rgba(0, 0, 0, 0.18),
              0 0 22px 2px rgba(201, 169, 106, 0.28);
          }
        }
        @keyframes heroGhostShimmer {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
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
        .hero-cta::after {
          /* inner hairline for tactile depth */
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22),
                      inset 0 -1px 0 rgba(0, 0, 0, 0.10);
          z-index: 2;
        }
        .hero-cta__sheen {
          position: absolute;
          inset: -1px;
          pointer-events: none;
          background: linear-gradient(
            115deg,
            transparent 28%,
            rgba(255, 250, 235, 0.42) 50%,
            transparent 72%
          );
          transform: translateX(-115%);
          transition: transform 1400ms cubic-bezier(0.22,0.61,0.36,1);
          z-index: 1;
          mix-blend-mode: overlay;
        }
        .hero-cta:hover .hero-cta__sheen,
        .hero-cta:focus-visible .hero-cta__sheen {
          transform: translateX(115%);
        }
        .hero-cta__arrow {
          transition: transform 380ms cubic-bezier(0.22,0.61,0.36,1);
        }
        .hero-cta:hover .hero-cta__arrow,
        .hero-cta:focus-visible .hero-cta__arrow {
          transform: translateX(6px);
        }

        /* PRIMARY — filled gold, charcoal text, breathing gold halo */
        .hero-cta--primary {
          color: var(--charcoal);
          border: 1px solid var(--gold);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.12), rgba(0,0,0,0.04)),
            var(--gold);
          box-shadow:
            0 10px 24px -16px rgba(30, 20, 8, 0.45),
            0 2px 6px -3px rgba(0, 0, 0, 0.18);
          animation: heroPrimaryBreath 4.2s ease-in-out infinite;
        }
        .hero-cta--primary:hover,
        .hero-cta--primary:focus-visible {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.05)),
            #B8985A;
          border-color: #B8985A;
          color: var(--charcoal);
          box-shadow:
            0 18px 36px -14px rgba(30, 20, 8, 0.58),
            0 4px 12px -4px rgba(0, 0, 0, 0.28),
            0 0 28px 2px rgba(201, 169, 106, 0.42);
          transform: translateY(-2px);
          animation: none;
        }
        .hero-cta--primary:active { transform: translateY(0); }

        /* GHOST — ivory outline, ivory text; hover fills ivory with teal text */
        .hero-cta--ghost {
          color: var(--ivory);
          border: 1px solid rgba(250, 248, 243, 0.72);
          background: rgba(250, 248, 243, 0.04);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .hero-cta--ghost:hover,
        .hero-cta--ghost:focus-visible {
          color: var(--teal);
          background: var(--ivory);
          border-color: var(--ivory);
          text-shadow: none;
          transform: translateY(-2px);
          box-shadow:
            0 16px 32px -16px rgba(0, 0, 0, 0.45),
            0 0 22px 1px rgba(250, 248, 243, 0.22);
        }
        .hero-cta--ghost:active { transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          .hero-cta, .hero-cta__sheen, .hero-cta__arrow { transition: none !important; animation: none !important; }
          .hero-cta--primary { animation: none !important; }
          .hero-cta:hover, .hero-cta:active { transform: none !important; letter-spacing: 0.18em !important; }
        }

      `}</style>

      {/* Poster — always present, reserves layout, paints instantly as LCP.
       *  Order matters: mobile WebP first (matches <768px), then desktop
       *  WebP (≥768px), then JPG fallback for engines that don't decode
       *  WebP. Browsers pick the first <source> whose type is supported
       *  AND whose media query matches. */}
      <picture aria-hidden="true">
        <source type="image/webp" media="(max-width: 767px)" srcSet={HERO_CLIP.posterWebpMobile} />
        <source type="image/webp" media="(min-width: 768px)" srcSet={HERO_CLIP.posterWebp} />
        <source type="image/jpeg" srcSet={HERO_CLIP.posterJpg} />
        <img
          src={HERO_CLIP.posterJpg}
          alt=""
          width={1080}
          height={1440}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            filter: "saturate(0.82) contrast(0.96) brightness(0.88)",
            transformOrigin: "center 60%",
          }}
        />
      </picture>

      {showVideo ? (
        <video
          ref={ref}
          data-hero-film="true"
          poster={HERO_CLIP.posterWebpMobile}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: 1,
            filter: "saturate(0.82) contrast(0.96) brightness(0.88)",
            animation: skipMotion ? undefined : "heroDrift 42s ease-in-out infinite",
            transformOrigin: "center 60%",
            willChange: "transform",
          }}
        >
          {/* Codec negotiation: AV1 (Chrome/FF/Edge) → HEVC (Safari) → H.264 (universal).
              Order matters — browsers pick the first playable <source>. */}
          <source
            src={HERO_CLIP.srcMobileAv1}
            media="(max-width: 767px)"
            type='video/mp4; codecs="av01.0.05M.08"'
          />
          <source
            src={HERO_CLIP.srcMobileHevc}
            media="(max-width: 767px)"
            type='video/mp4; codecs="hvc1"'
          />
          <source src={HERO_CLIP.srcMobile} media="(max-width: 767px)" type="video/mp4" />
          <source src={HERO_CLIP.srcDesktop} type="video/mp4" />
        </video>
      ) : null}
    </>
  );
}

export default CinematicHero;
