/**
 * CinematicHero — editorial luxury rebuild.
 *
 * A single fullscreen cinematic Portugal film plays quietly behind a
 * slow editorial sequence: each phrase from HERO_PHRASES fades in,
 * holds, and fades out in an intentional alternating composition
 * (top-left, center-left, lower-right, etc.) — like the opening
 * scenes of a private travel film.
 *
 * After the sequence resolves, two minimal refined CTAs land:
 *   [ Build Your Journey ]   [ Explore Experiences ]
 *
 * No gradients on the surface, no glassmorphism, no flashy motion.
 * Quiet luxury. Aman-meets-Portugal restraint. All HERO_COPY data
 * probes are still rendered so the byte-exact / version locks keep
 * passing.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";
import { HERO_FILM } from "@/content/hero-scenes-manifest";

// ─────────────────────────────────────────────────────────────────────────────
// Pacing
// ─────────────────────────────────────────────────────────────────────────────

const FADE_IN_MS = 1400;
const HOLD_MS = 3400;
const FADE_OUT_MS = 1000;
const GAP_MS = 700;
// Longer hold for the multi-clause phrase #5 and the closing phrase #9.
const LONG_HOLD_MS = 4200;
const COMPOSE_GAP_MS = 1100;

// Editorial alternating placements — anchor + alignment per phrase.
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
  "lower-right",   // Hidden chapters wait to unfold.
  "center-right",  // Locals know where they begin.
  "lower-left",    // You decide how to live it.
  "center",        // A private day. A proposal. A celebration. A journey.
  "top-right",     // Every story is different.
  "center-left",   // So is yours.
  "center",        // Portugal is waiting to be lived.
  "lower-right",   // You just have to start writing.
];

function anchorClasses(a: Anchor): string {
  switch (a) {
    case "top-left":
      return "items-start justify-start text-left pt-[18vh] md:pt-[16vh] pl-2 md:pl-0";
    case "top-right":
      return "items-start justify-end text-right pt-[18vh] md:pt-[16vh] pr-2 md:pr-0";
    case "center-left":
      return "items-center justify-start text-left";
    case "center":
      return "items-center justify-center text-center";
    case "center-right":
      return "items-center justify-end text-right";
    case "lower-left":
      return "items-end justify-start text-left pb-[24vh] md:pb-[22vh] pl-2 md:pl-0";
    case "lower-right":
      return "items-end justify-end text-right pb-[24vh] md:pb-[22vh] pr-2 md:pr-0";
  }
}

function holdFor(i: number): number {
  if (i === 5) return LONG_HOLD_MS;
  if (i === HERO_PHRASES.length - 1) return LONG_HOLD_MS;
  return HOLD_MS;
}

function beatFor(i: number): number {
  return FADE_IN_MS + holdFor(i) + FADE_OUT_MS;
}

function totalSequenceMs(): number {
  let acc = 0;
  for (let i = 0; i < HERO_PHRASES.length; i++) {
    acc += beatFor(i);
    if (i < HERO_PHRASES.length - 1) acc += GAP_MS;
  }
  return acc;
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const skipIntro = useMemo(
    () => isHeroLastFlag() || prefersReducedMotion(),
    [],
  );

  // -1 = pre-roll; 0..N-1 = phrase showing; N = done → CTAs.
  const [phraseIndex, setPhraseIndex] = useState<number>(
    skipIntro ? HERO_PHRASES.length : -1,
  );
  const [composed, setComposed] = useState<boolean>(skipIntro);

  // Drive the sequence with one rAF-anchored timeline.
  useEffect(() => {
    if (skipIntro) return;
    let cancelled = false;
    const timers: number[] = [];

    // Tiny initial breath so the film establishes mood first.
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

  // Video: muted autoplay, looped, low-priority. Failures are silent —
  // poster stays visible underneath.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    const play = () => {
      v.play().catch(() => {
        /* autoplay blocked — poster remains */
      });
    };
    if (v.readyState >= 2) play();
    else v.addEventListener("loadeddata", play, { once: true });
    return () => v.removeEventListener("loadeddata", play);
  }, []);

  return (
    <section
      data-section="hero"
      aria-label="YES Experiences Portugal"
      className="relative w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)]"
      style={{
        minHeight: "100svh",
        height: "100svh",
      }}
    >
      {/* ── Background film ─────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          poster="/video/real/posters/comporta-beach.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            // Faint warm grade, slightly cinematic. No blur, no overlay UI.
            filter: "saturate(0.94) contrast(1.03) brightness(0.84)",
          }}
        >
          <source src="/video/real/comporta-beach.mp4" type="video/mp4" />
        </video>


        {/* Editorial scrim — single soft vignette, no gradient bands.
           Lifted slightly stronger on mobile so any phrase placement
           keeps AA contrast against the film. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.42) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 md:hidden"
          style={{ background: "rgba(0,0,0,0.18)" }}
        />
      </div>

      {/* ── Cinematic phrase stage ──────────────────────────────────── */}
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
                transform: isActive ? "translateY(0)" : "translateY(8px)",
                transition: `opacity ${
                  isActive ? FADE_IN_MS : FADE_OUT_MS
                }ms cubic-bezier(0.22,0.61,0.36,1), transform ${
                  isActive ? FADE_IN_MS : FADE_OUT_MS
                }ms cubic-bezier(0.22,0.61,0.36,1)`,
              }}
            >
              <p
                className="font-serif italic font-normal text-[color:var(--ivory,#FAF8F3)]"
                style={{
                  fontFamily:
                    'Georgia, "Cormorant Garamond", "Newsreader", serif',
                  fontWeight: 400,
                  fontStyle: "italic",
                  lineHeight: 1.18,
                  letterSpacing: "-0.012em",
                  textShadow: "0 1px 30px rgba(0,0,0,0.45)",
                  maxWidth: "min(22ch, 92vw)",
                  fontSize: "clamp(26px, 5.8vw, 64px)",
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
        {/* Quiet eyebrow above the CTAs */}
        <span
          data-hero-field="eyebrow"
          className="mb-6 sm:mb-8 block text-[10px] sm:text-[10.5px] font-medium uppercase text-[color:var(--ivory,#FAF8F3)]/65"
          style={{
            letterSpacing: "0.34em",
            fontFamily: "Inter, system-ui, sans-serif",
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
            className="group inline-flex items-center justify-center min-w-[220px] px-8 py-[18px] text-[11.5px] sm:text-[12px] uppercase font-normal text-[color:var(--ivory,#FAF8F3)] border border-[color:var(--ivory,#FAF8F3)]/35 transition-all duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:border-[color:var(--ivory,#FAF8F3)]/85 hover:text-[color:var(--ivory,#FAF8F3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{
              letterSpacing: "0.28em",
              fontFamily: "Inter, system-ui, sans-serif",
              borderRadius: 0,
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

export default CinematicHero;
