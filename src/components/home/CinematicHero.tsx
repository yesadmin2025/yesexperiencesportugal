/**
 * Homepage hero — one continuous YES cinematic film over an editorial,
 * conversion-aware composition.
 *
 * The film is the visual source of truth. Copy arrives as a sequence of
 * quiet story beats instead of appearing as one website block. Reduced
 * motion and `?hero=last` render the final actionable state immediately.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";
import { HERO_FILM } from "@/content/hero-scenes-manifest";

/**
 * Cinematic pace. Let the film breathe first, then reveal the brand stanza,
 * a short editorial proposition, and only then the two actions.
 */
const EYEBROW_DELAY_MS = 350;
const LINE1_DELAY_MS = 950;
const LINE2_DELAY_MS = 1850;
const SUPPORT_DELAY_MS = 3000;
const PRIMARY_CTA_DELAY_MS = 3800;
const SECONDARY_CTA_DELAY_MS = 4200;
const HEADLINE_FADE_MS = 1150;
const SUPPORT_FADE_MS = 1000;
const CTA_FADE_MS = 850;

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

function revealStyle(on: boolean, ms: number, delayMs = 0, risePx = 14): React.CSSProperties {
  const delay = on ? delayMs : 0;
  return {
    opacity: on ? 1 : 0,
    transform: on ? "translate3d(0, 0, 0)" : `translate3d(0, ${risePx}px, 0)`,
    filter: on ? "blur(0)" : "blur(2px)",
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
    transform: on ? "translate3d(0, 0, 0)" : "translate3d(0, 30%, 0)",
    filter: on ? "blur(0)" : "blur(1.5px)",
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
    width="12"
    height="9"
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

  const supportSplit = HERO_COPY.subheadline.indexOf(". ");
  const supportLead =
    supportSplit >= 0 ? HERO_COPY.subheadline.slice(0, supportSplit + 1) : HERO_COPY.subheadline;
  const supportTail = supportSplit >= 0 ? HERO_COPY.subheadline.slice(supportSplit + 2) : "";

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
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
      className="hero-cinematic relative mt-[64px] h-[calc(100dvh-64px)] min-h-[calc(100svh-64px)] w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)] md:mt-[84px] md:h-[calc(100dvh-84px)] md:min-h-[calc(100svh-84px)] lg:mt-[96px] lg:h-[calc(100dvh-96px)] lg:min-h-[calc(100svh-96px)]"
    >
      <div className="hero-story-stage absolute inset-0 z-0">
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

        <div aria-hidden="true" className="hero-cinematic-scrim absolute inset-0" />
      </div>

      <div className="relative z-10 flex h-full items-center px-6 pb-[max(5rem,calc(env(safe-area-inset-bottom)+3.5rem))] pt-8 sm:px-10 md:pb-16 md:pt-10 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mx-auto max-w-[47rem] text-center">
            <p
              data-hero-field="eyebrow"
              className="hero-promise flex items-center justify-center gap-3.5 text-[10px] font-medium uppercase tracking-[0.3em] text-[color:var(--gold-soft)] [text-shadow:0_1px_10px_color-mix(in_oklab,var(--charcoal-deep)_55%,transparent)] sm:text-[11px]"
              style={revealStyle(eyebrow, 720, 0, 8)}
            >
              <span aria-hidden="true" className="h-px w-5 shrink-0 bg-[color:var(--gold)]/60 sm:w-7" />
              {HERO_COPY.eyebrow}
              <span aria-hidden="true" className="h-px w-5 shrink-0 bg-[color:var(--gold)]/60 sm:w-7" />
            </p>

            <h1
              data-hero-stanza="true"
              data-mixed-emphasis="exempt"
              className="hero-h1 mt-7 font-serif text-[clamp(2.55rem,6.2vw,5.1rem)] font-normal italic leading-[1.08] tracking-normal text-[color:var(--gold-soft)] [text-shadow:0_2px_18px_color-mix(in_oklab,var(--charcoal-deep)_55%,transparent)] sm:mt-8"
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
              className="hero-support mx-auto mt-7 max-w-[34rem] font-serif text-[16px] font-normal leading-[1.55] tracking-[-0.005em] text-[color:var(--gold-soft)]/90 [text-shadow:0_1px_14px_color-mix(in_oklab,var(--charcoal-deep)_65%,transparent)] sm:text-[17px] md:mt-8 md:text-[18px]"
              style={revealStyle(support, SUPPORT_FADE_MS, 0, 12)}
            >
              <span className="block">{supportLead} </span>
              {supportTail ? (
                <span className="mt-1 block text-[color:var(--ivory)]/82">{supportTail}</span>
              ) : null}
            </p>

            <div
              className="hero-cta-group mx-auto mt-8 flex w-full max-w-[25rem] flex-col gap-2.5 sm:mt-9"
              data-hero-composed={primaryCta && secondaryCta ? "true" : "false"}
            >
              <div className="w-full" style={revealStyle(primaryCta, CTA_FADE_MS, 0, 12)}>
                <Link
                  to="/studio-v3"
                  data-hero-field="primaryCta"
                  data-analytics="hero_open_studio"
                  data-analytics-placement="hero"
                  className="hero-cta group inline-flex min-h-[54px] w-full items-center justify-between border border-[color:var(--gold)]/30 bg-[color:var(--teal)] px-5 py-[14px] text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--ivory)] shadow-[0_14px_34px_-22px_rgba(0,0,0,0.8)] transition-[background-color,box-shadow,transform] duration-[var(--dur-base)] hover:-translate-y-px hover:bg-[color:var(--teal-2)] hover:shadow-[0_18px_38px_-20px_rgba(0,0,0,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:px-6 sm:text-[11.5px]"
                >
                  <span className="relative z-10">{HERO_COPY.primaryCta}</span>
                  <span className="relative z-10 text-[color:var(--gold-soft)] transition-transform duration-[var(--dur-base)] group-hover:translate-x-1">
                    {ARROW}
                  </span>
                </Link>
              </div>

              <div className="w-full" style={revealStyle(secondaryCta, CTA_FADE_MS, 0, 10)}>
                <Link
                  to="/experiences"
                  data-hero-field="secondaryCta"
                  data-analytics="hero_choose_experience"
                  data-analytics-placement="hero"
                  className="hero-cta group inline-flex min-h-[50px] w-full items-center justify-between border border-[color:var(--gold)]/55 bg-[color:color-mix(in_oklab,var(--charcoal-deep)_68%,transparent)] px-5 py-[12px] text-left text-[10.5px] uppercase tracking-[0.15em] text-[color:var(--gold-soft)] backdrop-blur-[7px] transition-[background-color,border-color,transform] duration-[var(--dur-base)] hover:-translate-y-px hover:border-[color:var(--gold)]/80 hover:bg-[color:color-mix(in_oklab,var(--charcoal-deep)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:px-6 sm:text-[11px]"
                >
                  <span className="relative z-10">{HERO_COPY.secondaryCta}</span>
                  <span className="relative z-10 transition-transform duration-[var(--dur-base)] group-hover:translate-x-1">
                    {ARROW}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="hero-editorial-handoff absolute inset-x-0 bottom-0 z-[5] h-[9%]" />

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
