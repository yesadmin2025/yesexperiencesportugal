/**
 * Homepage hero — restored "One Breath" composition.
 *
 * The held coastal-road film is the dominant element. Copy lives in
 * separate vertical zones with real negative space between them:
 *   eyebrow  → open sky above the stanza
 *   stanza   → upper-middle, at the historical ~30vh position
 *   support  → its own breathing room below the stanza
 *   CTAs     → anchored low, as in the original composition
 *
 * The eyebrow and support line are independent overlays inside space the
 * original composition already left empty — they never reflow the original
 * stanza or low CTA block. Reduced motion and `?hero=last` render the final
 * actionable state immediately.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HERO_COPY, HERO_COPY_VERSION, HERO_PHRASES } from "@/content/hero-copy";
import { HERO_FILM } from "@/content/hero-scenes-manifest";

/** Cinematic pace: one breath per beat, full actionable state by ~4.5s. */
const EYEBROW_DELAY_MS = 300;
const LINE1_DELAY_MS = 900;
const LINE2_DELAY_MS = 1700;
const SUPPORT_DELAY_MS = 2600;
const CTA_DELAY_MS = 3500;
const TEXT_FADE_MS = 1300;
const CTA_FADE_MS = 1000;
const EASE = "cubic-bezier(0.22,1,0.36,1)";

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
    transform: on ? "translateY(0)" : "translateY(14px)",
    willChange: "opacity, transform",
    transition: `opacity ${ms}ms ${EASE}, transform ${ms}ms ${EASE}`,
  };
}

/** The original stanza treatment — clean Fraunces italic, one subtle shadow. */
const stanzaStyle: React.CSSProperties = {
  fontWeight: 400,
  fontStyle: "italic",
  lineHeight: 1.14,
  letterSpacing: "-0.005em",
  fontSize: "clamp(34px, 5.6vw, 62px)",
};

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
  const skipIntro = useMemo(shouldSkipIntro, []);
  // Stages always start hidden so SSR and the client's first render agree;
  // `mounted` flips after hydration and applies the final state (instantly
  // for skip-intro visitors, staged otherwise).
  const [mounted, setMounted] = useState(false);
  const [eyebrow, setEyebrow] = useState(false);
  const [line1, setLine1] = useState(false);
  const [line2, setLine2] = useState(false);
  const [support, setSupport] = useState(false);
  const [composed, setComposed] = useState(false);
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
    setMounted(true);
    if (skipIntro) {
      setEyebrow(true);
      setLine1(true);
      setLine2(true);
      setSupport(true);
      setComposed(true);
      return;
    }
    const te = window.setTimeout(() => setEyebrow(true), EYEBROW_DELAY_MS);
    const t1 = window.setTimeout(() => setLine1(true), LINE1_DELAY_MS);
    const t2 = window.setTimeout(() => setLine2(true), LINE2_DELAY_MS);
    const ts = window.setTimeout(() => setSupport(true), SUPPORT_DELAY_MS);
    const tc = window.setTimeout(() => setComposed(true), CTA_DELAY_MS);
    return () => {
      window.clearTimeout(te);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(ts);
      window.clearTimeout(tc);
    };
  }, [skipIntro]);

  return (
    <section
      data-section="hero"
      data-hero-cinematic="true"
      aria-label="YES Experiences Portugal"
      className="hero-cinematic relative mt-[64px] min-h-[calc(100svh-64px)] w-full overflow-hidden bg-[color:var(--charcoal-deep,#1a1816)] md:mt-[84px] md:min-h-[calc(100svh-84px)] lg:mt-[96px] lg:min-h-[calc(100svh-96px)]"
    >
      {/* ── Held cinematic film ─────────────────────────────────────── */}
      <div className="hero-story-stage absolute inset-0 z-0">
        <picture className="absolute inset-0 block h-full w-full">
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
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden="true"
        >
          <source
            src={HERO_FILM.src720}
            media="(max-width: 767px)"
            type="video/mp4"
          />
          <source src={HERO_FILM.src1080} type="video/mp4" />
        </video>

        {/* Original grading: lifted blacks, gentle vignette, mobile stanza band. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(38, 30, 22, 0.06)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.34) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[30%] h-[40%] md:hidden pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.18) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* The original composition is intentionally preserved as separate
          zones. The added eyebrow and support occupy existing negative space
          without pushing the stanza or the low actions out of position. */}
      <div className="hero-eyebrow-zone absolute inset-x-0 top-[19%] z-10 flex justify-center px-6 sm:top-[21%]">
        <p
          data-hero-field="eyebrow"
          className="hero-promise m-0 text-center text-[10px] font-medium uppercase tracking-[0.24em] sm:text-[11px] sm:tracking-[0.26em]"
          style={revealStyle(eyebrow, TEXT_FADE_MS)}
        >
          {HERO_COPY.eyebrow}
        </p>
      </div>

      <div className="hero-stanza-zone absolute inset-x-0 top-[28%] z-10 flex justify-center px-5 sm:top-[30%] sm:px-10 md:px-16">
        <h1
          data-hero-stanza="true"
          data-mixed-emphasis="exempt"
          className="hero-h1 m-0 text-center font-serif"
        >
          <span
            className="hero-title-line block font-serif font-normal italic m-0"
            data-hero-field="headlineLine1"
            style={{ ...stanzaStyle, ...revealStyle(line1, TEXT_FADE_MS) }}
          >
            {HERO_PHRASES[0]}
          </span>
          <span
            className="hero-title-line mt-2 block font-serif italic font-normal text-[color:var(--gold-soft)] sm:mt-2.5"
            data-hero-field="headlineLine2"
            style={{ ...stanzaStyle, ...revealStyle(line2, TEXT_FADE_MS) }}
          >
            {HERO_PHRASES[1]}
          </span>
        </h1>
      </div>

      <div className="hero-support-zone absolute inset-x-0 top-[52%] z-10 flex justify-center px-6 sm:top-[54%] sm:px-10 md:px-16">
        <p
          data-hero-field="subheadline"
          className="hero-support m-0 max-w-[20rem] text-center font-serif text-[16px] font-normal not-italic leading-[1.55] sm:max-w-[32rem] sm:text-[18px]"
          style={revealStyle(support, TEXT_FADE_MS)}
        >
          {HERO_COPY.subheadline}
        </p>
      </div>

      {/* Original low CTA anchor. */}
      <div
        className="hero-cta-group absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 px-6 pb-[max(3.25rem,calc(env(safe-area-inset-bottom)+2.5rem))] sm:flex-row sm:justify-center sm:gap-4 sm:pb-14 md:pb-20"
        data-hero-composed={composed ? "true" : "false"}
        style={{
          opacity: composed ? 1 : 0,
          transform: composed ? "translateY(0)" : "translateY(12px)",
          transition: `opacity ${CTA_FADE_MS}ms ${EASE}, transform ${CTA_FADE_MS}ms ${EASE}`,
          pointerEvents: composed ? "auto" : "none",
        }}
      >
        <Link
          to="/studio-v3"
          data-hero-field="primaryCta"
          data-analytics="hero_open_studio"
          data-analytics-placement="hero"
        className="hero-cta hero-cta--primary group inline-flex min-h-[44px] min-w-[196px] items-center justify-center whitespace-nowrap px-7 text-[10.5px] uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:min-w-[206px] sm:text-[11px]"
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
          className="hero-cta hero-cta--ghost group inline-flex min-h-[44px] min-w-[196px] items-center justify-center whitespace-nowrap px-7 text-[10.5px] uppercase tracking-[0.18em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:min-w-[206px] sm:text-[11px]"
        >
          <span className="hero-cta__sheen" aria-hidden="true" />
          <span className="relative z-10">{HERO_COPY.secondaryCta}</span>
        </Link>
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
    </section>
  );
}
