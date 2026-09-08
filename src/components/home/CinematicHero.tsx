/**
 * Homepage hero — editorial "One Breath" cadence over a conversion-first layout.
 *
 * The two brand lines enter one after the other (opacity + slight rise + soft
 * blur), then the proposition and the two CTAs compose in. The whole sequence
 * completes well under 2.2s, so nobody waits to act. Reduced motion and
 * `?hero=last` render the final state immediately.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";

const HERO_CLIP = {
  srcMobile: "/__l5e/assets-v1/ff4f2c39-2fde-42f1-9b4a-7230c692f1e9/hero-sunset-road-720.mp4",
  srcDesktop: "/__l5e/assets-v1/422f19b8-dad0-4ae0-b952-e4fc9a048abe/hero-sunset-road-1080.mp4",
  srcMobileHevc:
    "/__l5e/assets-v1/07f8da30-1c73-4d49-a615-19beccd6bc17/hero-sunset-road-720.hevc.mp4",
  srcMobileAv1:
    "/__l5e/assets-v1/5b4b22ae-6087-461f-b6bb-2befd85ae8de/hero-sunset-road-720.av1.mp4",
  posterWebp: "/video/hero-sunset-road-poster.webp",
  posterWebpMobile: "/video/hero-sunset-road-poster-720.webp",
} as const;

/** Premium but fast: full actionable state by ~1.75s. */
const LINE1_DELAY_MS = 380;
const LINE2_DELAY_MS = 1050;
const COMPOSE_DELAY_MS = 1600;
const FADE_MS = 900;
const COMPOSE_FADE_MS = 700;

const EASE = "cubic-bezier(0.22,0.61,0.36,1)";

function shouldSkipIntro(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("hero") === "last") return true;
  } catch {
    /* ignore */
  }
  try {
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function revealStyle(on: boolean, ms: number): React.CSSProperties {
  return {
    opacity: on ? 1 : 0,
    transform: on ? "translateY(0)" : "translateY(10px)",
    filter: on ? "blur(0px)" : "blur(4px)",
    willChange: "opacity, transform, filter",
    transition: `opacity ${ms}ms ${EASE}, transform ${ms}ms ${EASE}, filter ${ms}ms ${EASE}`,
  };
}

const ARROW = (
  <svg className="hero-cta__arrow" width="10" height="7" viewBox="0 0 14 10" fill="none" aria-hidden="true">
    <path
      d="M1 5h11M8.5 1.8L12.2 5l-3.7 3.2"
      stroke="currentColor"
      strokeWidth="0.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CTA_CLASS =
  "group inline-flex items-center justify-center whitespace-nowrap w-full max-w-[330px] sm:max-w-[380px] lg:max-w-none lg:w-full px-5 sm:px-6 py-[14px] sm:py-[13px] min-h-[44px] text-[10.5px] sm:text-[11px] lg:text-[11.5px] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold,#C9A96A)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent";

const CTA_STYLE: React.CSSProperties = { fontFamily: "Inter, system-ui, sans-serif", fontWeight: 450 };

export function CinematicHero() {
  const [line1, setLine1] = useState(false);
  const [line2, setLine2] = useState(false);
  const [composed, setComposed] = useState(false);

  useEffect(() => {
    if (shouldSkipIntro()) {
      setLine1(true);
      setLine2(true);
      setComposed(true);
      return;
    }
    const t1 = window.setTimeout(() => setLine1(true), LINE1_DELAY_MS);
    const t2 = window.setTimeout(() => setLine2(true), LINE2_DELAY_MS);
    const t3 = window.setTimeout(() => setComposed(true), COMPOSE_DELAY_MS);
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
      className="relative min-h-[92svh] w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)]"
    >
      <div className="hero-story-stage absolute inset-0 z-0">
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(max-width: 767px)" srcSet={HERO_CLIP.posterWebpMobile} />
          <img
            src={HERO_CLIP.posterWebp}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
        </picture>

        <video
          data-hero-film
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_CLIP.posterWebp}
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        >
          <source
            media="(max-width: 767px)"
            src={HERO_CLIP.srcMobileAv1}
            type="video/mp4; codecs=av01"
          />
          <source
            media="(max-width: 767px)"
            src={HERO_CLIP.srcMobileHevc}
            type="video/mp4; codecs=hvc1"
          />
          <source media="(max-width: 767px)" src={HERO_CLIP.srcMobile} type="video/mp4" />
          <source src={HERO_CLIP.srcDesktop} type="video/mp4" />
        </video>

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,18,16,0.32)_0%,rgba(16,18,16,0.20)_34%,rgba(16,18,16,0.58)_76%,rgba(16,18,16,0.76)_100%)]"
        />
      </div>

      <div className="relative z-10 flex min-h-[92svh] items-end px-5 pb-[max(3.25rem,calc(env(safe-area-inset-bottom)+2.25rem))] pt-28 sm:px-8 md:items-center md:pb-10 md:pt-24 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-3xl text-left md:mx-auto md:text-center">
            <p
              data-hero-field="eyebrow"
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F1D8AB]/85 sm:text-[12px]"
              style={revealStyle(line1, FADE_MS)}
            >
              {HERO_COPY.eyebrow}
            </p>

            <h1
              data-hero-stanza="true"
              className="mt-5 font-serif text-[clamp(2.4rem,6vw,5.2rem)] font-normal italic leading-[0.98] tracking-[-0.025em] text-[#F7E6C8] [text-shadow:0_2px_18px_rgba(0,0,0,0.38)]"
            >
              <span
                data-hero-field="headlineLine1"
                className="block font-serif italic font-normal m-0"
                style={revealStyle(line1, FADE_MS)}
              >
                {HERO_PHRASES[0]}
              </span>
              <span
                data-hero-field="headlineLine2"
                className="block font-serif italic font-normal mt-3 sm:mt-4"
                style={revealStyle(line2, FADE_MS)}
              >
                {HERO_PHRASES[1]}
              </span>
            </h1>

            <p
              data-hero-field="subheadline"
              className="mt-6 max-w-2xl text-[16px] leading-[1.65] text-white/92 sm:text-[18px] md:mx-auto"
              style={revealStyle(composed, COMPOSE_FADE_MS)}
            >
              {HERO_COPY.subheadline}
            </p>

            <div
              className="hero-cta-group mt-8 flex flex-col gap-3 sm:flex-row md:justify-center"
              data-hero-composed={composed ? "true" : "false"}
              style={{
                ...revealStyle(composed, COMPOSE_FADE_MS),
                filter: undefined,
                pointerEvents: composed ? "auto" : "none",
              }}
            >
              <Link
                to="/studio-v3"
                data-hero-field="primaryCta"
                data-analytics="hero_open_studio"
                data-analytics-placement="hero"
                className={`hero-cta hero-cta--primary ${CTA_CLASS}`}
                style={CTA_STYLE}
              >
                <span className="hero-cta__sheen" aria-hidden="true" />
                <span className="relative z-10 inline-flex items-center gap-2.5">
                  {HERO_COPY.primaryCta}
                  {ARROW}
                </span>
              </Link>
              <Link
                to="/experiences"
                data-hero-field="secondaryCta"
                data-analytics="hero_choose_experience"
                data-analytics-placement="hero"
                className={`hero-cta hero-cta--ghost ${CTA_CLASS}`}
                style={CTA_STYLE}
              >
                <span className="hero-cta__sheen" aria-hidden="true" />
                <span className="relative z-10 inline-flex items-center gap-2.5">
                  {HERO_COPY.secondaryCta}
                  {ARROW}
                </span>
              </Link>
            </div>

            <div
              className="mt-5 flex flex-col gap-3 text-[13px] leading-[1.55] text-white/82 md:items-center"
              style={revealStyle(composed, COMPOSE_FADE_MS)}
            >
              <p data-hero-field="microcopy">{HERO_COPY.microcopy}</p>
              <Link
                to="/multi-day"
                data-hero-field="brandLine"
                className="inline-flex min-h-[44px] items-center text-[#F1D8AB] underline decoration-[color:var(--gold)]/80 underline-offset-4 hover:text-white"
              >
                {HERO_COPY.brandLine}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="sr-only">
        <p className="hero-h1">
          <span>{HERO_COPY.headlineLine1}</span> <span>{HERO_COPY.headlineLine2}</span>
        </p>
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
        className="sr-only"
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
