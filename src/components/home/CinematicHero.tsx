/**
 * Homepage hero — the continuous YES cinematic film with chapter overlays,
 * over a conversion-first composition.
 *
 * ONE uninterrupted <video> (HERO_FILM, ~27.1s) is the visual source of
 * truth — never a carousel, never stacked clips. HERO_SCENES supplies the
 * chapter overlay timeline: restrained editorial lines that cross-fade as
 * the film advances.
 *
 * Conversion never waits for the film: the brand stanza, proposition and
 * both CTAs compose in about 1.5s. Reduced motion and `?hero=last`
 * render the final actionable state immediately.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { trackEvent } from "@/lib/analytics-events";
import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";
import { HERO_FILM } from "@/content/hero-scenes-manifest";

/**
 * Cinematic pace: the eyebrow opens, the stanza follows one line at a time,
 * and the full actionable state settles in roughly 1.5s. Nothing springs.
 */
const EYEBROW_DELAY_MS = 80;
const LINE1_DELAY_MS = 260;
const LINE2_DELAY_MS = 390;
const SUPPORT_DELAY_MS = 620;
const CTA_DELAY_MS = 820;
const LINKS_DELAY_MS = 970;
const HEADLINE_FADE_MS = 650;
const SUPPORT_FADE_MS = 620;
const CTA_FADE_MS = 580;

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

function revealStyle(on: boolean, ms: number, delayMs = 0, risePx = 22): React.CSSProperties {
  // `delayMs` staggers the composed block so the closing elements arrive
  // one after another (eyebrow → subheadline → CTAs → quiet links) rather
  // than snapping in together. Delay only applies on the way in.
  const delay = on ? delayMs : 0;
  return {
    opacity: on ? 1 : 0,
    transform: on ? "translateY(0)" : `translateY(${risePx}px)`,
    filter: on ? "blur(0px)" : "blur(5px)",
    willChange: "opacity, transform, filter",
    transition:
      `opacity ${ms}ms ${EASE} ${delay}ms, ` +
      `transform ${ms}ms ${EASE} ${delay}ms, ` +
      `filter ${ms}ms ${EASE} ${delay}ms`,
  };
}

function headlineRevealStyle(on: boolean): React.CSSProperties {
  return {
    opacity: on ? 1 : 0,
    transform: on ? "translate3d(0, 0, 0)" : "translate3d(0, 38%, 0)",
    filter: on ? "blur(0px)" : "blur(2px)",
    willChange: "opacity, transform, filter",
    transition:
      `opacity ${HEADLINE_FADE_MS}ms ${EASE}, ` +
      `transform ${HEADLINE_FADE_MS}ms ${EASE}, ` +
      `filter ${HEADLINE_FADE_MS}ms ${EASE}`,
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
  const [cta, setCta] = useState(false);
  const [links, setLinks] = useState(false);
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
      setCta(true);
      setLinks(true);
      return;
    }
    const te = window.setTimeout(() => setEyebrow(true), EYEBROW_DELAY_MS);
    const t1 = window.setTimeout(() => setLine1(true), LINE1_DELAY_MS);
    const t2 = window.setTimeout(() => setLine2(true), LINE2_DELAY_MS);
    const ts = window.setTimeout(() => setSupport(true), SUPPORT_DELAY_MS);
    const tc = window.setTimeout(() => setCta(true), CTA_DELAY_MS);
    const tl = window.setTimeout(() => setLinks(true), LINKS_DELAY_MS);
    return () => {
      window.clearTimeout(te);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(ts);
      window.clearTimeout(tc);
      window.clearTimeout(tl);
    };
  }, []);

  return (
    <section
      data-section="hero"
      data-hero-cinematic="true"
      data-hero-ready="false"
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

      <div className="relative z-10 flex min-h-[calc(100svh-64px)] items-center px-6 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4rem))] pt-10 sm:px-10 sm:items-end md:min-h-[calc(100svh-84px)] md:items-center md:pb-16 md:pt-12 lg:min-h-[calc(100svh-96px)] lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-[52rem] text-left md:mx-auto md:text-center">
            <p
              data-hero-field="eyebrow"
              className="hero-promise flex items-center gap-3.5 text-[11px] font-medium uppercase tracking-[0.32em] text-[#F2DDAE] [text-shadow:0_1px_10px_rgba(0,0,0,0.55)] sm:text-[11.5px] md:justify-center"
              style={revealStyle(eyebrow, 520, 0, 10)}
            >
              <span aria-hidden="true" className="hidden h-px w-7 shrink-0 bg-[color:var(--gold)]/70 md:block" />
              {HERO_COPY.eyebrow}
              <span aria-hidden="true" className="hidden h-px w-7 shrink-0 bg-[color:var(--gold)]/70 md:block" />
            </p>

            <h1
              data-hero-stanza="true"
              data-mixed-emphasis="exempt"
              className="hero-h1 mt-8 font-serif text-[clamp(2.5rem,7vw,5.75rem)] font-normal italic leading-[1.08] tracking-normal text-[color:var(--gold-soft)] [text-shadow:0_2px_18px_color-mix(in_oklab,var(--charcoal-deep)_55%,transparent)]"
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
              <span className="hero-title-mask mt-2 block sm:mt-3">
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
              className="mt-8 max-w-[38rem] font-sans text-[16px] font-normal leading-[1.65] text-[color:var(--ivory)]/95 [text-shadow:0_1px_14px_rgba(0,0,0,0.5)] sm:text-[17px] md:mx-auto"
              style={revealStyle(support, SUPPORT_FADE_MS, 0, 13)}
            >
              {HERO_COPY.subheadline}
            </p>

            <div
              className="hero-cta-group mt-10 flex w-full max-w-[44rem] flex-col items-start gap-3 md:mx-auto md:items-center md:justify-center"
              data-hero-composed={cta ? "true" : "false"}
              style={{
                ...revealStyle(cta, CTA_FADE_MS, 0, 12),
                filter: undefined,
                pointerEvents: cta ? "auto" : "none",
              }}
            >
              <Link
                to="/studio-v3"
                data-hero-field="primaryCta"
                data-analytics="hero_open_studio"
                data-analytics-placement="hero"
                className="hero-cta group inline-flex min-h-[56px] w-full items-center justify-center whitespace-nowrap px-6 py-[15px] text-[11px] uppercase tracking-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:max-w-[420px] sm:px-7 sm:text-[11.5px] hero-cta--primary"
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
                className="hero-cta group inline-flex min-h-[48px] w-full items-center justify-center whitespace-nowrap px-1 py-2.5 text-[10.5px] uppercase tracking-[0.14em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:max-w-[420px] sm:px-1 sm:text-[11px] hero-cta--ghost"
              >
                <span className="hero-cta__sheen" aria-hidden="true" />
                <span className="relative z-10 inline-flex items-center gap-2.5">
                  {HERO_COPY.secondaryCta}
                  {ARROW}
                </span>
              </Link>
            </div>

            <div
              className="mt-9 flex items-center text-[12px] leading-[1.55] md:justify-center"
              style={revealStyle(links, 480, 0, 10)}
            >
              <Link
                to="/multi-day"
                data-hero-field="brandLine"
                className="inline-flex min-h-[44px] items-center text-[#F1D8AB]/95 transition-colors duration-500 hover:text-white"
              >
                {HERO_COPY.brandLine}
              </Link>
              <span aria-hidden="true" className="hidden md:inline mx-5 text-[color:var(--gold)]/40">·</span>
              <Link
                to="/book"
                data-testid="hero-book-direct"
                onClick={() =>
                  trackEvent("booking_cta_click", { placement: "home:hero-direct-book" })
                }
                className="hidden md:inline-flex min-h-[44px] items-center text-[12px] text-[color:var(--ivory)]/65 transition-colors duration-500 hover:text-white"
              >
                Know your dates? Book a day directly →
              </Link>
            </div>
          </div>
        </div>
      </div>

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
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=document.currentScript&&document.currentScript.closest('[data-hero-cinematic]');if(!s)return;var q=new URLSearchParams(location.search);var reduced=matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;if(q.get('hero')==='last'||reduced)s.setAttribute('data-hero-ready','true')}catch(e){}})();`,
        }}
      />
    </section>
  );
}
