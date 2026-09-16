/**
 * Homepage hero — the continuous YES cinematic film with chapter overlays,
 * over a conversion-first composition.
 *
 * ONE uninterrupted <video> (HERO_FILM, ~27.1s) is the visual source of
 * truth — never a carousel, never stacked clips. HERO_SCENES supplies the
 * chapter overlay timeline: restrained editorial lines that cross-fade as
 * the film advances.
 *
 * Conversion never waits for the film: every action exists and remains
 * interactive while the visual sequence composes over about 4.8s. Reduced motion and `?hero=last`
 * render the final actionable state immediately.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";
import { HERO_FILM } from "@/content/hero-scenes-manifest";

/**
 * Cinematic pace: the eyebrow opens, the stanza follows one line at a time,
 * and the full actionable state settles in roughly 4.8s. Nothing springs.
 */
const EYEBROW_DELAY_MS = 320;
const LINE1_DELAY_MS = 1050;
const LINE2_DELAY_MS = 1980;
const SUPPORT_DELAY_MS = 3050;
const PRIMARY_CTA_DELAY_MS = 3950;
const SECONDARY_CTA_DELAY_MS = 4480;
const HEADLINE_FADE_MS = 1120;
const SUPPORT_FADE_MS = 1040;
const CTA_FADE_MS = 860;

const EASE = "var(--ease-scene)";

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

function revealStyle(on: boolean, ms: number, delayMs = 0, risePx = 12): React.CSSProperties {
  // `delayMs` staggers the composed block so the closing elements arrive
  // one after another (eyebrow → subheadline → CTAs → quiet links) rather
  // than snapping in together. Delay only applies on the way in.
  const delay = on ? delayMs : 0;
  return {
    opacity: on ? 1 : 0,
    transform: on ? "translateY(0)" : `translateY(${risePx}px)`,
    willChange: "opacity, transform",
    transition:
      `opacity ${ms}ms ${EASE} ${delay}ms, ` +
      `transform ${ms}ms ${EASE} ${delay}ms`,
  };
}

function headlineRevealStyle(on: boolean): React.CSSProperties {
  return {
    opacity: on ? 1 : 0,
    transform: on ? "translate3d(0, 0, 0)" : "translate3d(0, 12px, 0)",
    willChange: "opacity, transform",
    transition:
      `opacity ${HEADLINE_FADE_MS}ms ${EASE}, ` +
      `transform ${HEADLINE_FADE_MS}ms ${EASE}`,
  };
}

const ARROW = (
  <svg
    className="hero-cta__arrow"
    width="11"
    height="8"
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
);

export function CinematicHero() {
  const [eyebrow, setEyebrow] = useState(false);
  const [line1, setLine1] = useState(false);
  const [line2, setLine2] = useState(false);
  const [support, setSupport] = useState(false);
  const [primaryCta, setPrimaryCta] = useState(false);
  const [secondaryCta, setSecondaryCta] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Chromium ignores `media` on <video><source>, so phones would otherwise
    // download the 1080p master. Re-point to the light mobile encode on small
    // screens before the first play attempt.
    try {
      const small = window.matchMedia?.("(max-width: 767px)").matches;
      if (small && !v.currentSrc.includes(HERO_FILM.src720)) {
        v.src = HERO_FILM.src720;
        v.load();
      }
    } catch {
      /* keep the declarative sources */
    }
    const kick = () => void v.play().catch(() => {});
    kick();
    v.addEventListener("loadeddata", kick);
    return () => v.removeEventListener("loadeddata", kick);
  }, []);

  useEffect(() => {
    if (shouldSkipIntro()) {
      setEyebrow(true);
      setLine1(true);
      setLine2(true);
      setSupport(true);
      setPrimaryCta(true);
      setSecondaryCta(true);
      return;
    }
    const te = window.setTimeout(() => setEyebrow(true), EYEBROW_DELAY_MS);
    const t1 = window.setTimeout(() => setLine1(true), LINE1_DELAY_MS);
    const t2 = window.setTimeout(() => setLine2(true), LINE2_DELAY_MS);
    const ts = window.setTimeout(() => setSupport(true), SUPPORT_DELAY_MS);
    const tp = window.setTimeout(() => setPrimaryCta(true), PRIMARY_CTA_DELAY_MS);
    const ts2 = window.setTimeout(() => setSecondaryCta(true), SECONDARY_CTA_DELAY_MS);
    return () => {
      window.clearTimeout(te);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(ts);
      window.clearTimeout(tp);
      window.clearTimeout(ts2);
    };
  }, []);

  return (
    <section
      data-section="hero"
      data-hero-cinematic="true"
      aria-label="YES Experiences Portugal"
      className="hero-cinematic relative mt-[64px] min-h-[calc(100svh-64px)] w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)] md:mt-[84px] md:min-h-[calc(100svh-84px)] lg:mt-[96px] lg:min-h-[calc(100svh-96px)]"
    >
      <div className="hero-story-stage absolute inset-0 z-0">
        {/* The film opens at a whisper of zoom and exhales to rest. */}
        <picture className="hero-film-settle absolute inset-0 block h-full w-full">
          <source
            media="(max-width: 767px)"
            srcSet={HERO_FILM.posterMobile}
            type="image/webp"
          />
          <img
            src={HERO_FILM.poster}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </picture>

        <video
          ref={videoRef}
          data-hero-film
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_FILM.poster}
          className="hero-film-settle absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        >
          <source
            src={HERO_FILM.src720}
            media="(max-width: 767px)"
            type="video/mp4"
          />
          <source
            src={HERO_FILM.src1080}
            type="video/mp4"
          />
        </video>

        {/* Restrained grading so copy is AA readable without crushing the film. */}
        <div
          aria-hidden="true"
          className="hero-cinematic-scrim absolute inset-0"
        />
      </div>

      <div className="hero-cinematic-content relative z-10 flex min-h-[calc(100svh-64px)] items-center px-5 pb-[max(2.75rem,calc(env(safe-area-inset-bottom)+2rem))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-10 md:min-h-[calc(100svh-84px)] md:pb-16 md:pt-12 lg:min-h-[calc(100svh-96px)] lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="hero-cinematic-composition mx-auto max-w-[47rem] text-center">
            <p
              data-hero-field="eyebrow"
              className="hero-promise flex items-center justify-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gold-soft)] [text-shadow:0_1px_12px_color-mix(in_oklab,var(--charcoal-deep)_78%,transparent)] sm:text-[10.5px]"
              style={revealStyle(eyebrow, 820, 0, 7)}
            >
              <span aria-hidden="true" className="block h-px w-4 shrink-0 bg-[color:var(--gold)]/70 md:w-7" />
              {HERO_COPY.eyebrow}
              <span aria-hidden="true" className="block h-px w-4 shrink-0 bg-[color:var(--gold)]/70 md:w-7" />
            </p>

            <h1
              data-hero-stanza="true"
              data-mixed-emphasis="exempt"
               className="hero-h1 mt-14 font-serif text-[clamp(2.15rem,5.2vw,4.4rem)] font-normal italic leading-[1.12] tracking-normal text-[color:var(--gold-soft)] [text-shadow:0_2px_14px_color-mix(in_oklab,var(--charcoal-deep)_62%,transparent)] md:mt-16"
            >
              <span className="hero-title-mask block">
                <span
                  className="hero-title-line block font-serif font-normal italic m-0"
                  data-hero-field="headlineLine1"
                  style={headlineRevealStyle(line1)}
                >
                  {HERO_PHRASES[0]}
                </span>
              </span>
              <span className="hero-title-mask mt-2.5 block sm:mt-3">
                <span
                  className="hero-title-line block font-serif italic font-normal text-[color:var(--gold-soft)]"
                  data-hero-field="headlineLine2"
                  style={headlineRevealStyle(line2)}
                >
                  {HERO_PHRASES[1]}
                </span>
              </span>
            </h1>

            <p
              data-hero-field="subheadline"
              className="hero-support mx-auto mt-11 max-w-[22rem] font-serif text-[15px] font-normal not-italic leading-[1.58] sm:max-w-[31rem] sm:text-[16px] md:mt-12 md:max-w-[34rem] md:text-[17px]"
              style={revealStyle(support, SUPPORT_FADE_MS, 0, 9)}
            >
              {HERO_COPY.subheadline}
            </p>

            <div
              className="hero-cta-group mx-auto mt-10 flex w-full max-w-[18rem] flex-col items-center gap-3.5 md:mt-11 md:max-w-[37rem] md:flex-row md:justify-center md:gap-4"
              data-hero-composed={primaryCta && secondaryCta ? "true" : "false"}
            >
              <Link
                to="/studio-v3"
                data-hero-field="primaryCta"
                data-analytics="hero_open_studio"
                data-analytics-placement="hero"
                className="hero-cta group inline-flex min-h-[46px] w-full max-w-[15.25rem] items-center justify-center whitespace-nowrap px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:w-auto sm:min-w-[15.25rem] sm:px-8 sm:text-[10.5px] md:min-w-[17.5rem] hero-cta--primary"
                style={revealStyle(primaryCta, CTA_FADE_MS, 0, 9)}
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
                className="hero-cta group inline-flex min-h-[44px] w-full max-w-[18rem] items-center justify-center whitespace-nowrap px-6 py-2.5 text-[10px] uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:w-auto sm:min-w-[18rem] sm:px-8 sm:text-[10.5px] md:min-w-[17.5rem] hero-cta--ghost"
                style={revealStyle(secondaryCta, CTA_FADE_MS, 0, 8)}
              >
                <span className="hero-cta__sheen" aria-hidden="true" />
                <span className="relative z-10 inline-flex items-center gap-2.5">
                  {HERO_COPY.secondaryCta}
                </span>
              </Link>
            </div>

          </div>
        </div>
      </div>

      <div aria-hidden="true" className="hero-editorial-handoff absolute inset-x-0 bottom-0 z-[5] h-[4%]" />

      <div
        data-hero-copy-version={HERO_COPY_VERSION}
        data-hero-eyebrow={HERO_COPY.eyebrow}
        data-hero-headline={`${HERO_COPY.headlineLine1} ${HERO_COPY.headlineLine2}`}
        data-hero-subheadline={HERO_COPY.subheadline}
        data-hero-primary-cta={HERO_COPY.primaryCta}
        data-hero-secondary-cta={HERO_COPY.secondaryCta}
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
