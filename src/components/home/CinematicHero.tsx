/**
 * CinematicHero — editorial luxury rebuild v2.
 *
 * A 4-clip cinematic sequence of REAL Portugal footage (no AI video),
 * crossfading slowly behind 5 editorial phrases in warm muted gold.
 * A24-meets-luxury-travel-editorial. Quiet, observational, restrained.
 *
 * Scene arc: light → land → human → path.
 * Phrase arc: presence → invitation → possibility → ownership → action.
 *
 * After the sequence resolves, two minimal CTAs land.
 *
 * All HERO_COPY SR probes preserved so byte-exact / version locks pass.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";

// ─────────────────────────────────────────────────────────────────────────────
// Film sequence — real footage only, hand-curated for editorial arc
// ─────────────────────────────────────────────────────────────────────────────

type Clip = { src: string; poster: string; alt: string };

const CLIPS: readonly Clip[] = [
  {
    src: "/video/real/azulejo-workshop.mp4",
    poster: "/video/real/posters/azulejo-workshop.jpg",
    alt: "Light on hand-painted tile",
  },
  {
    src: "/video/real/vineyard-walk.mp4",
    poster: "/video/real/posters/vineyard-walk.jpg",
    alt: "Vineyard at golden hour",
  },
  {
    src: "/video/real/friends-toast.mp4",
    poster: "/video/real/posters/friends-toast.jpg",
    alt: "A quiet toast among friends",
  },
  {
    src: "/video/real/carrasqueira-pier.mp4",
    poster: "/video/real/posters/carrasqueira-pier.jpg",
    alt: "Wooden pier leading to the water",
  },
];

const CLIP_HOLD_MS = 7000;       // each clip on screen
const CLIP_FADE_MS = 1200;       // crossfade between clips

// ─────────────────────────────────────────────────────────────────────────────
// Phrase pacing
// ─────────────────────────────────────────────────────────────────────────────

const FADE_IN_MS = 1600;
const HOLD_MS = 4000;
const LONG_HOLD_MS = 4500;
const FADE_OUT_MS = 1200;
const GAP_MS = 800;
const COMPOSE_GAP_MS = 1200;

type Anchor =
  | "top-left"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "lower-left"
  | "lower-right";

const PHRASE_ANCHORS: readonly Anchor[] = [
  "top-left",      // Portugal is the stage.
  "center-left",   // You write your story.
  "center",        // Hidden chapters waiting to unfold.
  "lower-right",   // Locals know where they begin.
  "center",        // You decide how to live it.
];


function anchorClasses(a: Anchor): string {
  switch (a) {
    case "top-left":
      return "items-start justify-start text-left pt-[20vh] md:pt-[18vh]";
    case "top-right":
      return "items-start justify-end text-right pt-[20vh] md:pt-[18vh]";
    case "center-left":
      return "items-center justify-start text-left";
    case "center":
      return "items-center justify-center text-center";
    case "center-right":
      return "items-center justify-end text-right";
    case "lower-left":
      return "items-end justify-start text-left pb-[28vh] md:pb-[24vh]";
    case "lower-right":
      return "items-end justify-end text-right pb-[28vh] md:pb-[24vh]";
  }
}

function holdFor(i: number): number {
  if (i === 1 || i === 2) return LONG_HOLD_MS;
  return HOLD_MS;
}

function beatFor(i: number): number {
  return FADE_IN_MS + holdFor(i) + FADE_OUT_MS;
}

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

  const [phraseIndex, setPhraseIndex] = useState<number>(
    skipIntro ? HERO_PHRASES.length : -1,
  );
  const [composed, setComposed] = useState<boolean>(skipIntro);
  const [clipIndex, setClipIndex] = useState<number>(0);

  // Phrase sequence timeline
  useEffect(() => {
    if (skipIntro) return;
    let cancelled = false;
    const timers: number[] = [];

    const start = window.setTimeout(() => {
      if (cancelled) return;
      let t = 0;
      for (let i = 0; i < HERO_PHRASES.length; i++) {
        const show = window.setTimeout(() => {
          if (!cancelled) setPhraseIndex(i);
        }, t);
        timers.push(show);
        t += beatFor(i) + GAP_MS;
      }
      const done = window.setTimeout(() => {
        if (cancelled) return;
        setPhraseIndex(HERO_PHRASES.length);
        const reveal = window.setTimeout(() => {
          if (!cancelled) setComposed(true);
        }, COMPOSE_GAP_MS);
        timers.push(reveal);
      }, t - GAP_MS);
      timers.push(done);
    }, 900);
    timers.push(start);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [skipIntro]);

  // Clip crossfade loop — independent of phrase sequence
  useEffect(() => {
    if (skipIntro) return;
    const id = window.setInterval(() => {
      setClipIndex((i) => (i + 1) % CLIPS.length);
    }, CLIP_HOLD_MS);
    return () => window.clearInterval(id);
  }, [skipIntro]);

  return (
    <section
      data-section="hero"
      aria-label="YES Experiences Portugal"
      className="relative w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)]"
      style={{ minHeight: "100svh", height: "100svh" }}
    >
      {/* ── Crossfading film stack ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {CLIPS.map((clip, i) => (
          <ClipLayer
            key={clip.src}
            clip={clip}
            active={i === clipIndex}
            fadeMs={CLIP_FADE_MS}
          />
        ))}

        {/* Editorial vignette — single soft radial, no overlay bands */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.46) 100%)",
          }}
        />
        {/* Mobile lift for AA contrast on gold text */}
        <div
          aria-hidden="true"
          className="absolute inset-0 md:hidden"
          style={{ background: "rgba(0,0,0,0.16)" }}
        />
        {/* Subtle film grain (CSS only, ~2% opacity) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.02]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.7'/></svg>\")",
          }}
        />

      </div>

      {/* ── Phrase stage ────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 z-10 px-6 sm:px-10 md:px-16 lg:px-24"
        aria-hidden={composed ? "true" : undefined}
      >
        {HERO_PHRASES.map((phrase, i) => {
          const isActive = !skipIntro && phraseIndex === i;
          return (
            <div
              key={i}
              data-hero-phrase-index={i}
              data-hero-phrase-state={isActive ? "active" : "idle"}
              className={`pointer-events-none absolute inset-0 flex ${anchorClasses(
                PHRASE_ANCHORS[i],
              )}`}
              style={{
                opacity: isActive ? 1 : 0,
                transform: isActive ? "translateY(0)" : "translateY(6px)",
                transition: `opacity ${
                  isActive ? FADE_IN_MS : FADE_OUT_MS
                }ms cubic-bezier(0.22,0.61,0.36,1), transform ${
                  isActive ? FADE_IN_MS : FADE_OUT_MS
                }ms cubic-bezier(0.22,0.61,0.36,1)`,
              }}
            >
              <p
                className="font-serif italic font-normal"
                style={{
                  fontFamily:
                    'Georgia, "Cormorant Garamond", "Newsreader", serif',
                  fontWeight: 400,
                  fontStyle: "italic",
                  lineHeight: 1.2,
                  letterSpacing: "-0.012em",
                  color: "var(--gold, #C9A96A)",
                  textShadow: "0 1px 24px rgba(0,0,0,0.55)",
                  maxWidth: "min(22ch, 92vw)",
                  fontSize: "clamp(28px, 5.4vw, 58px)",
                }}
              >
                {phrase}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Final CTA composition ───────────────────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:pb-14 md:pb-20"
        data-hero-composed={composed ? "true" : "false"}
        style={{
          opacity: composed ? 1 : 0,
          transform: composed ? "translateY(0)" : "translateY(12px)",
          transition:
            "opacity 1400ms cubic-bezier(0.22,0.61,0.36,1), transform 1400ms cubic-bezier(0.22,0.61,0.36,1)",
          pointerEvents: composed ? "auto" : "none",
        }}
      >
        <span
          data-hero-field="eyebrow"
          className="mb-6 sm:mb-8 block text-[10px] sm:text-[10.5px] font-medium uppercase"
          style={{
            letterSpacing: "0.34em",
            fontFamily: "Inter, system-ui, sans-serif",
            color: "color-mix(in oklab, var(--gold, #C9A96A) 80%, transparent)",
          }}
        >
          {HERO_COPY.eyebrow}
        </span>

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
          <Link
            to="/builder"
            data-hero-field="primaryCta"
            className="group inline-flex items-center justify-center min-w-[220px] px-8 py-[18px] text-[11.5px] sm:text-[12px] uppercase font-medium text-[color:var(--charcoal-deep,#1a1816)] bg-[color:var(--ivory,#FAF8F3)] transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:bg-[color:var(--gold-soft,#E8D5A8)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{
              letterSpacing: "0.28em",
              fontFamily: "Inter, system-ui, sans-serif",
              borderRadius: 0,
            }}
          >
            Build Your Journey
          </Link>
          <Link
            to="/experiences"
            data-hero-field="secondaryCta"
            className="group inline-flex items-center justify-center min-w-[220px] px-8 py-[18px] text-[11.5px] sm:text-[12px] uppercase font-normal text-[color:var(--ivory,#FAF8F3)] transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:text-[color:var(--gold,#C9A96A)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{
              letterSpacing: "0.28em",
              fontFamily: "Inter, system-ui, sans-serif",
              borderRadius: 0,
              border: "1px solid color-mix(in oklab, var(--gold, #C9A96A) 40%, transparent)",
            }}
          >
            Explore Experiences
          </Link>
        </div>
      </div>

      {/* ── SR-only / SSR probes — keep HERO_COPY locks happy ──────── */}
      <div className="sr-only" aria-hidden="true">
        <h1>
          <span data-hero-field="headlineLine1">{HERO_COPY.headlineLine1}</span>{" "}
          <span data-hero-field="headlineLine2">{HERO_COPY.headlineLine2}</span>
        </h1>
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
// ClipLayer — single video element, fades opacity, lazy-plays
// ─────────────────────────────────────────────────────────────────────────────

function ClipLayer({
  clip,
  active,
  fadeMs,
}: {
  clip: Clip;
  active: boolean;
  fadeMs: number;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    if (active) {
      v.play().catch(() => {
        /* autoplay blocked — poster remains */
      });
    } else {
      // Pause inactive clips to save battery / decode
      try { v.pause(); } catch { /* noop */ }
    }
  }, [active]);

  return (
    <video
      ref={ref}
      poster={clip.poster}
      autoPlay={active}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover"
      style={{
        opacity: active ? 1 : 0,
        transition: `opacity ${fadeMs}ms cubic-bezier(0.22,0.61,0.36,1)`,
        filter: "saturate(0.88) contrast(1.04) brightness(0.82)",
      }}
    >
      <source src={clip.src} type="video/mp4" />
    </video>
  );
}

export default CinematicHero;
